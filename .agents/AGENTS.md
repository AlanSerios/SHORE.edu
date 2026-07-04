### Responsive Design & Feature Parity
- **Never Drop Features for Mobile:** When adapting a desktop UI to mobile, absolutely DO NOT remove application features, navigation routes, or user controls just to save space. Mobile users must have 100% feature parity with desktop users.
- **Handling Overflowing Navigation:** If a desktop sidebar contains too many items to fit in a Mobile Bottom Navigation Bar (which comfortably holds max 4-5 items), you MUST implement a "Hamburger Menu / Drawer" or a "More Tools" tab to house the remaining items.
- **Touch Scrolling:** When building grids, tables, or calendars, always ensure they are scrollable on touch devices (avoid trapping them in `overflow-hidden` containers).
