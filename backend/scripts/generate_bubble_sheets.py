import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, Color

def draw_fiducials(c, width, height, margin=0.5*inch, size=0.5*inch):
    # Draw 4 solid black squares in the corners (essential for OMR)
    c.setFillColorRGB(0, 0, 0)
    c.rect(margin, height - margin - size, size, size, fill=1, stroke=0)
    c.rect(width - margin - size, height - margin - size, size, size, fill=1, stroke=0)
    c.rect(margin, margin, size, size, fill=1, stroke=0)
    c.rect(width - margin - size, margin, size, size, fill=1, stroke=0)

def draw_header(c, width, height, num_items):
    primary_color = HexColor("#0F172A")
    muted_color = HexColor("#64748B")
    
    # Main Header
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(primary_color)
    c.drawString(1*inch, height - 1.2*inch, "SHORE.ed")
    
    c.setFont("Helvetica", 12)
    c.setFillColor(muted_color)
    c.drawString(1*inch, height - 1.45*inch, f"OMR Assessment Sheet - {num_items} Items")
    
    # Instructions
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(1*inch, height - 1.65*inch, "Use a dark pen/pencil. Fill bubbles completely.")
    
    # Info Box (Left Side)
    box_x = 1*inch
    box_y = height - 2.8*inch
    box_w = 4.0*inch
    box_h = 1.0*inch
    
    c.setStrokeColor(HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.roundRect(box_x, box_y, box_w, box_h, radius=6, fill=0, stroke=1)
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(primary_color)
    c.drawString(box_x + 15, box_y + box_h - 25, "Name:")
    c.drawString(box_x + 15, box_y + box_h - 55, "Class:")
    c.drawString(box_x + box_w/2 + 10, box_y + box_h - 55, "Date:")
    
    # Lines for input
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.line(box_x + 55, box_y + box_h - 25, box_x + box_w - 15, box_y + box_h - 25)
    c.line(box_x + 55, box_y + box_h - 55, box_x + box_w/2 - 5, box_y + box_h - 55)
    c.line(box_x + box_w/2 + 45, box_y + box_h - 55, box_x + box_w - 15, box_y + box_h - 55)
    
    # Student ID Grid (Right Side)
    id_w = 2.2*inch
    id_x = width - 1*inch - id_w
    id_y = height - 2.8*inch
    id_h = 1.8*inch
    
    # ID Box
    c.setStrokeColor(HexColor("#E2E8F0"))
    c.roundRect(id_x, id_y, id_w, id_h, radius=6, fill=0, stroke=1)
    
    # ID Box Header
    c.setFillColor(HexColor("#F8FAFC"))
    c.roundRect(id_x, id_y + id_h - 20, id_w, 20, radius=6, fill=1, stroke=0)
    # Fix bottom corners of header to be square
    c.rect(id_x, id_y + id_h - 20, id_w, 10, fill=1, stroke=0)
    c.setStrokeColor(HexColor("#E2E8F0"))
    c.roundRect(id_x, id_y, id_w, id_h, radius=6, fill=0, stroke=1)
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(primary_color)
    c.drawCentredString(id_x + id_w/2, id_y + id_h - 14, "STUDENT ID")
    
    # ID Bubbles
    c.setFont("Helvetica", 7)
    c.setStrokeColor(HexColor("#94A3B8"))
    c.setLineWidth(0.5)
    
    for col in range(5):
        col_center_x = id_x + (id_w / 5) * col + (id_w / 10)
        for row in range(10):
            bx = col_center_x
            by = id_y + id_h - 35 - row * 11
            c.circle(bx, by, 4.5, fill=0, stroke=1)
            c.setFillColor(muted_color)
            c.drawCentredString(bx, by - 2.5, str(row))

def generate_sheet(num_items, output_filename):
    c = canvas.Canvas(output_filename, pagesize=letter)
    width, height = letter
    
    draw_fiducials(c, width, height)
    draw_header(c, width, height, num_items)
    
    # Bubbles section
    options = ["A", "B", "C", "D", "E"]
    
    if num_items <= 50:
        cols = 2
    elif num_items <= 75:
        cols = 3
    elif num_items <= 125:
        cols = 4
    elif num_items <= 150:
        cols = 5
    else:
        cols = 6
        
    items_per_col = (num_items + cols - 1) // cols
    
    start_x = 0.8 * inch
    start_y = height - 3.4 * inch
    col_width = (width - 1.6 * inch) / cols
    
    avail_height = start_y - 1.0 * inch
    row_height = min(18, avail_height / items_per_col)
    
    bubble_radius = min(6, row_height * 0.4)
    bubble_spacing = bubble_radius * 2.5
    
    primary_color = HexColor("#0F172A")
    muted_color = HexColor("#64748B")
    bubble_stroke = HexColor("#94A3B8")
    zebra_bg = HexColor("#F8FAFC")
    
    c.setFont("Helvetica-Bold", 8)
    
    for i in range(num_items):
        col_idx = i // items_per_col
        row_idx = i % items_per_col
        
        x = start_x + col_idx * col_width
        y = start_y - row_idx * row_height
        
        # Zebra striping background for readability
        if row_idx % 2 == 1:
            c.setFillColor(zebra_bg)
            c.rect(x + 5, y - row_height/2 + 2, col_width - 15, row_height, fill=1, stroke=0)
            
        # Item Number
        c.setFillColor(primary_color)
        c.drawRightString(x + 20, y - 2.5, f"{i+1}.")
        
        # Bubbles
        c.setStrokeColor(bubble_stroke)
        c.setLineWidth(0.7)
        c.setFillColor(muted_color)
        
        for opt_idx, opt in enumerate(options):
            bx = x + 35 + opt_idx * bubble_spacing
            c.circle(bx, y, bubble_radius, fill=0, stroke=1)
            # Make the letter inside the bubble slightly smaller
            c.setFont("Helvetica", bubble_radius * 1.2) 
            c.drawCentredString(bx, y - (bubble_radius*0.4), opt)
            
        c.setFont("Helvetica-Bold", 8)
            
    c.save()
    print(f"Generated {output_filename}")

if __name__ == "__main__":
    items_list = [30, 50, 75, 100, 125, 150, 200]
    out_dir = r"C:\Users\Alan Serios\Downloads\bubble_sheets"
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    for n in items_list:
        generate_sheet(n, os.path.join(out_dir, f"omr_sheet_{n}.pdf"))
