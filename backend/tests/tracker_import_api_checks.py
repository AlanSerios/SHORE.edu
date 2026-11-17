import copy
import json
import unittest
from unittest.mock import patch

import firebase_admin
import firebase_admin.db

firebase_admin._apps.clear()
firebase_admin.credentials.Certificate = lambda *_args, **_kwargs: object()
firebase_admin.initialize_app = lambda *_args, **_kwargs: object()


class BootstrapReference:
    def get(self):
        return None


firebase_admin.db.reference = lambda *_args, **_kwargs: BootstrapReference()

import server


SECTION_MAXIMA = {
    'Arithmetic': 8,
    'Algebra': 9,
    'Geometry': 11,
    'Trigonometry': 6,
    'Statistics & Probability': 6,
    'Biology': 10,
    'Chemistry': 10,
    'Physics': 10,
    'Earth & Space': 10,
    'Pattern Series': 11,
    'Spatial Reasoning': 10,
    'Mechanical Reasoning': 10,
    'Logical Reasoning': 9,
    'Grammar & Syntax': 12,
    'Vocabulary': 10,
    'Error Identification': 8,
    'Reading Comprehension': 10,
}


def score_row(name, score=0, email=''):
    return {
        'name': name,
        'email': email,
        'subtopics': {topic: min(score, maximum) for topic, maximum in SECTION_MAXIMA.items()},
    }


def stored_record(name, total=0, email=''):
    return {'name': name, 'email': email, 'total': total, 'totalMax': 160, 'subjects': {}, 'subtopics': {}}


class FakeReference:
    def __init__(self, store, key):
        self.store = store
        self.key = key

    def get(self):
        return copy.deepcopy(self.store.get(self.key))

    def transaction(self, callback):
        result = callback(copy.deepcopy(self.store.get(self.key)))
        if not isinstance(result, str):
            raise ValueError("Tracker writes must use the Firebase JSON string format")
        self.store[self.key] = copy.deepcopy(result)
        return copy.deepcopy(result)


class FakeDatabase:
    def __init__(self):
        self.store = {}

    def reference(self, key):
        return FakeReference(self.store, key)


class TrackerImportApiTests(unittest.TestCase):
    def setUp(self):
        self.database = FakeDatabase()
        db_patch = patch.object(server, 'db', self.database)
        db_patch.start()
        self.addCleanup(db_patch.stop)
        self.client = server.app.test_client()

    def request_as(self, user, method, path, **kwargs):
        with patch.object(server, 'get_current_user', return_value=user):
            return getattr(self.client, method)(path, **kwargs)

    def post_import(self, rows, revision='', mode='replace', confirm=False):
        return self.request_as(
            {'role': 'admin', 'email': 'admin@example.com'},
            'post',
            '/api/tracker_data',
            json={
                'assessmentId': 'shore-pretest-160-v2',
                'revision': revision,
                'filename': 'diagnostic.xlsx',
                'mode': mode,
                'confirmReplace': confirm,
                'rows': rows,
            },
        )

    def saved_tracker(self):
        stored = self.database.store['tracker_data']
        return json.loads(stored) if isinstance(stored, str) else stored

    def test_restore_legacy_json_backup_with_punctuation_in_student_name(self):
        snapshot = {
            'pre': {'Sample A. Student': {'total': 70, 'subjects': {}}},
            'post': {},
            'sessions': [{'name': 'Session 1'}],
        }
        before = json.dumps({
            'revision': 3,
            'pre': {},
            'history': [{'id': 'older', 'fileName': 'scores.xlsx', 'createdAt': '2026-11-01', 'data': snapshot}],
        })
        self.database.store['tracker_data'] = before
        admin = {'role': 'admin'}

        history = self.request_as(admin, 'get', '/api/tracker_data/history').json
        self.assertEqual(history['history'][0]['filename'], 'scores.xlsx')
        self.assertNotIn('data', history['history'][0])
        missing = self.request_as(admin, 'post', '/api/tracker_data/restore', json={'backupId': 'missing', 'revision': 3})
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(self.database.store['tracker_data'], before)

        response = self.request_as(admin, 'post', '/api/tracker_data/restore', json={'backupId': 'older', 'revision': 3})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['restoredCount'], 1)
        self.assertTrue(response.json['legacyFormat'])
        self.assertEqual(self.saved_tracker()['pre'], snapshot['pre'])
        self.assertEqual(self.saved_tracker()['sessions'], snapshot['sessions'])
        self.assertEqual(self.saved_tracker()['history'][0]['snapshot']['revision'], 3)

    def test_tracker_reads_require_auth_and_filter_by_role(self):
        self.database.store['tracker_data'] = {
            'schemaVersion': 2,
            'assessmentId': 'shore-pretest-160-v1',
            'revision': 'rev-1',
            'pre': {'Alice': stored_record('Alice', email='alice@example.com'), 'Bob': stored_record('Bob', email='bob@example.com')},
            'post': {},
        }

        self.assertEqual(self.client.get('/api/tracker_data').status_code, 401)
        student = self.request_as({'role': 'student', 'name': 'Alice', 'email': 'alice@example.com'}, 'get', '/api/tracker_data')
        self.assertEqual(list(student.json['pre']), ['Alice'])
        volunteer = self.request_as({'role': 'volunteer', 'email': 'helper@example.com'}, 'get', '/api/tracker_data')
        self.assertEqual(volunteer.json['pre'], {})

    def test_old_split_scores_are_read_as_official_combined_sections(self):
        self.database.store['tracker_data'] = {
            'schemaVersion': 2,
            'assessmentId': 'shore-pretest-160-v1',
            'revision': 'rev-legacy',
            'pre': {'Legacy': {
                'name': 'Legacy',
                'email': 'legacy@example.com',
                'subtopics': {
                    'Mathematics': {'Statistics': {'score': 4, 'max': 6}},
                    'Science': {'Earth Science': {'score': 7, 'max': 8}, 'Space Science': {'score': 1, 'max': 2}},
                    'Abstract Reasoning': {'Pattern Reasoning': {'score': 9, 'max': 11}},
                    'English Proficiency': {'Grammar': {'score': 10, 'max': 11}, 'Written Organization': {'score': 1, 'max': 1}},
                },
            }},
            'post': {},
        }

        response = self.request_as({'role': 'admin'}, 'get', '/api/tracker_data')
        record = response.json['pre']['Legacy']
        self.assertEqual(response.json['assessmentId'], 'shore-pretest-160-v2')
        self.assertEqual(record['subtopics']['Mathematics']['Statistics & Probability']['score'], 4)
        self.assertEqual(record['subtopics']['Science']['Earth & Space']['score'], 8)
        self.assertEqual(record['subtopics']['Abstract Reasoning']['Pattern Series']['score'], 9)
        self.assertEqual(record['subtopics']['English Proficiency']['Grammar & Syntax']['score'], 11)

    def test_non_admin_cannot_import_and_invalid_scores_do_not_write(self):
        with patch.object(server, 'get_current_user', return_value={'role': 'student'}):
            forbidden = self.client.post('/api/tracker_data', json={})
        self.assertEqual(forbidden.status_code, 403)

        before = {'schemaVersion': 2, 'assessmentId': 'shore-pretest-160-v1', 'revision': 'rev-1', 'pre': {}, 'post': {}}
        self.database.store['tracker_data'] = copy.deepcopy(before)
        bad_row = score_row('Alice')
        bad_row['subtopics']['Earth & Space'] = 11
        invalid = self.post_import([bad_row], revision='rev-1')
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(self.database.store['tracker_data'], before)

    def test_merge_preserves_post_scores_and_history_restore_is_revision_checked(self):
        self.database.store['tracker_data'] = {
            'schemaVersion': 2,
            'assessmentId': 'shore-pretest-160-v1',
            'revision': 'rev-1',
            'pre': {'Alice': stored_record('Alice', email='alice@example.com')},
            'post': {'Alice': stored_record('Alice', total=90, email='alice@example.com')},
        }

        merged = self.post_import([score_row('Bob', 1, 'bob@example.com')], revision='rev-1', mode='merge')
        self.assertEqual(merged.status_code, 200)
        self.assertEqual(set(self.saved_tracker()['pre']), {'Alice', 'Bob'})
        self.assertIn('Alice', self.saved_tracker()['post'])

        history = self.request_as({'role': 'admin'}, 'get', '/api/tracker_data/history')
        self.assertEqual(len(history.json['history']), 1)
        backup_id = history.json['history'][0]['id']
        stale = self.request_as({'role': 'admin'}, 'post', '/api/tracker_data/restore', json={'backupId': backup_id, 'revision': 'rev-1'})
        self.assertEqual(stale.status_code, 409)
        restored = self.request_as({'role': 'admin'}, 'post', '/api/tracker_data/restore', json={'backupId': backup_id, 'revision': merged.json['revision']})
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(set(self.saved_tracker()['pre']), {'Alice'})
        self.assertIn('Alice', self.saved_tracker()['post'])

    def test_replace_requires_confirmation_and_can_be_restored(self):
        self.database.store['tracker_data'] = {
            'schemaVersion': 2,
            'assessmentId': 'shore-pretest-160-v1',
            'revision': 'rev-1',
            'pre': {'Alice': stored_record('Alice'), 'Bob': stored_record('Bob')},
            'post': {},
        }

        denied = self.post_import([score_row('Alice')], revision='rev-1')
        self.assertEqual(denied.status_code, 409)
        self.assertEqual(set(self.saved_tracker()['pre']), {'Alice', 'Bob'})
        saved = self.post_import([score_row('Alice')], revision='rev-1', confirm=True)
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json['removedCount'], 1)

        backup_id = saved.json['backupId']
        restored = self.request_as({'role': 'admin'}, 'post', '/api/tracker_data/restore', json={'backupId': backup_id, 'revision': saved.json['revision']})
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(set(self.saved_tracker()['pre']), {'Alice', 'Bob'})

    def test_old_scores_are_preserved_as_legacy_during_first_import(self):
        self.database.store['tracker_data'] = {'pre': {'Legacy Student': {'total': 700, 'subjects': {}}}, 'post': {}}

        imported = self.post_import([score_row('New Student')], mode='merge')
        self.assertEqual(imported.status_code, 200)
        current = self.saved_tracker()
        self.assertEqual(set(current['pre']), {'New Student'})
        self.assertIn('Legacy Student', current['legacyData']['pre'])
        loaded = self.request_as({'role': 'admin'}, 'get', '/api/tracker_data').json
        self.assertEqual(imported.json['tracker']['pre'], loaded['pre'])

    def test_restored_flat_s5_records_are_visible_in_current_diagnostic(self):
        scores = dict(SECTION_MAXIMA)
        scores['Statistics'] = scores.pop('Statistics & Probability')
        snapshot = {'pre': {
            'Scored Student': {'subjects': scores, 'total': 160},
            'Unverified Blank': {'subjects': dict.fromkeys(scores, 0), 'total': 0},
        }}
        self.database.store['tracker_data'] = json.dumps({
            'revision': 3, 'history': [{'id': 's5', 'data': snapshot}],
        })
        admin = {'role': 'admin'}
        restored = self.request_as(admin, 'post', '/api/tracker_data/restore', json={'backupId': 's5', 'revision': 3})
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json['diagnosticCount'], 1)
        self.assertFalse(restored.json['legacyFormat'])
        records = self.request_as(admin, 'get', '/api/tracker_data').json['pre']
        self.assertEqual(list(records), ['Scored Student'])
        self.assertEqual(records['Scored Student']['subjects']['Mathematics'], 40)


if __name__ == '__main__':
    unittest.main()
