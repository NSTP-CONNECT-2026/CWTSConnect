import os
import pymupdf

def build_hipo_svg():
    # Geometry constants
    W = 3120
    H = 1280
    cx_root = 1560
    
    # Modules Data Structure
    modules = [
        # ROW 1
        {
            "id": "1.0",
            "name": "1.0 USER ACCOUNT & PROFILE MANAGEMENT",
            "col_idx": 0,
            "row_idx": 0,
            "sub_processes": [
                {
                    "num": "1.1",
                    "title": "Account Registration & OTP Verification",
                    "input": "User Registration Data & Institutional Email",
                    "process": "Validate Credentials & Verify 6-digit OTP Code",
                    "output": "Verified Active User Account Record"
                },
                {
                    "num": "1.2",
                    "title": "Student Profiling & GIS Geotagging",
                    "input": "Student Profile Info, Skills, Address & GPS",
                    "process": "Record Academic Details & Geocode Coordinates",
                    "output": "Geotagged Student Profile & GIS Record"
                },
                {
                    "num": "1.3",
                    "title": "Role-Based Access & Session Control",
                    "input": "Login Credentials & User Role Type",
                    "process": "Authenticate Credentials & Issue Session Token",
                    "output": "Authorized Active User Dashboard Session"
                }
            ]
        },
        {
            "id": "2.0",
            "name": "2.0 CHED CMO COMPLIANCE VERIFICATION",
            "col_idx": 1,
            "row_idx": 0,
            "sub_processes": [
                {
                    "num": "2.1",
                    "title": "Legal Document Submission",
                    "input": "Parent Waiver, Medical Certificate & Valid ID",
                    "process": "Validate File Formats & Store Document Uploads",
                    "output": "Student Compliance Document Records"
                },
                {
                    "num": "2.2",
                    "title": "Coordinator Review & Verification",
                    "input": "Submitted Student Document Submissions",
                    "process": "Review Authenticity & Verify Compliance Status",
                    "output": "Approved Compliance & Deployment Clearance"
                },
                {
                    "num": "2.3",
                    "title": "Compliance Tracking & Notifications",
                    "input": "Verification Status & Evaluation Updates",
                    "process": "Evaluate Eligibility & Trigger Status Alerts",
                    "output": "Deployment Eligibility Notification"
                }
            ]
        },
        {
            "id": "3.0",
            "name": "3.0 COMMUNITY OUTREACH REQUEST MANAGEMENT",
            "col_idx": 2,
            "row_idx": 0,
            "sub_processes": [
                {
                    "num": "3.1",
                    "title": "Barangay Proposal Submission",
                    "input": "Community Request Details, Volunteers & GPS",
                    "process": "Validate Project Scope & Log Community Needs",
                    "output": "Pending Community Outreach Request"
                },
                {
                    "num": "3.2",
                    "title": "Proposal Evaluation & Approval",
                    "input": "Pending Community Outreach Requests",
                    "process": "Review Feasibility & Endorse Community Project",
                    "output": "Approved Community Outreach Project Record"
                },
                {
                    "num": "3.3",
                    "title": "Service & Skills Categorization",
                    "input": "Standard Service Catalog & Required Skills",
                    "process": "Map Community Needs to Service Categories",
                    "output": "Classified Project Criteria for DSS Matching"
                }
            ]
        },
        # ROW 2
        {
            "id": "4.0",
            "name": "4.0 DSS MATCHING & VOLUNTEER DEPLOYMENT",
            "col_idx": 0,
            "row_idx": 1,
            "sub_processes": [
                {
                    "num": "4.1",
                    "title": "Candidate Matching & Scoring (DSS)",
                    "input": "Eligible Student Profiles, Skills & Coordinates",
                    "process": "Compute Skill Relevance & Proximity Distance",
                    "output": "Ranked Candidate DSS Matching Results"
                },
                {
                    "num": "4.2",
                    "title": "Deployment Roster Formation",
                    "input": "Ranked Student Matches & Volunteer Quota",
                    "process": "Assemble Optimal Volunteer Batch & Assign",
                    "output": "Official Deployment Roster & Team Record"
                },
                {
                    "num": "4.3",
                    "title": "Schedule & Notice Dispatch",
                    "input": "Approved Deployment Schedule & Roster",
                    "process": "Dispatch Project Schedules to Students & Officials",
                    "output": "Deployment Schedules & Assignment Notices"
                }
            ]
        },
        {
            "id": "5.0",
            "name": "5.0 FIELD ATTENDANCE & MAKE-UP MANAGEMENT",
            "col_idx": 1,
            "row_idx": 1,
            "sub_processes": [
                {
                    "num": "5.1",
                    "title": "Field Attendance Logging (DTR)",
                    "input": "Student Attendance Time-In/Out & Photo Proof",
                    "process": "Record Daily Attendance & Geotag Verification",
                    "output": "Verified Daily Field Attendance Log Record"
                },
                {
                    "num": "5.2",
                    "title": "Community Official DTR Verification",
                    "input": "Daily Student Attendance Logs",
                    "process": "Review & Validate Rendered Service Hours",
                    "output": "Approved Rendered Hours Progress Record"
                },
                {
                    "num": "5.3",
                    "title": "Make-Up Request Processing",
                    "input": "Absence Excuse Letter & Make-Up Petition",
                    "process": "Review Make-Up Excuse & Assign Replacement Duty",
                    "output": "Approved Make-Up Plan & Hours Adjustment"
                }
            ]
        },
        {
            "id": "6.0",
            "name": "6.0 EVALUATION, AUDIT & CERTIFICATION",
            "col_idx": 2,
            "row_idx": 1,
            "sub_processes": [
                {
                    "num": "6.1",
                    "title": "Student Performance Evaluation",
                    "input": "Barangay Official Rating & Evaluation Rubrics",
                    "process": "Calculate Student Performance Scores",
                    "output": "Official Student Performance Evaluation Record"
                },
                {
                    "num": "6.2",
                    "title": "54-Hour Curriculum Progress Audit",
                    "input": "Total Rendered Hours & Attendance Summary",
                    "process": "Audit Mandatory 54-Hour CWTS Requirement",
                    "output": "Curriculum Completion Clearance Record"
                },
                {
                    "num": "6.3",
                    "title": "Certificate & Summary Report Generation",
                    "input": "Verified Completion Clearance & Project Data",
                    "process": "Compile Program Analytics & Format Certificates",
                    "output": "Completion Certificates & Summary Reports"
                }
            ]
        }
    ]

    svg_lines = []
    svg_lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    svg_lines.append('''  <defs>
    <style>
      .bg { fill: #ffffff; }
      .line { stroke: #000000; stroke-width: 1.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .line-thick { stroke: #000000; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .root-box { fill: #ffffff; stroke: #000000; stroke-width: 2.2; rx: 4; }
      .root-title { font-family: "Segoe UI", Arial, sans-serif; font-size: 16px; font-weight: 800; fill: #000000; text-anchor: middle; letter-spacing: 0.04em; }
      .root-sub { font-family: "Segoe UI", Arial, sans-serif; font-size: 11.5px; font-weight: 600; fill: #333333; text-anchor: middle; }
      
      .mod-box { fill: #f5f6f8; stroke: #000000; stroke-width: 1.8; rx: 3; }
      .mod-title { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; font-weight: 800; fill: #000000; text-anchor: middle; letter-spacing: 0.02em; }
      
      .sub-box { fill: #fafafa; stroke: #000000; stroke-width: 1.4; rx: 3; }
      .sub-num { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5px; font-weight: 800; fill: #000000; text-anchor: middle; }
      .sub-title { font-family: "Segoe UI", Arial, sans-serif; font-size: 10.5px; font-weight: 700; fill: #111111; text-anchor: middle; }
      
      .ipo-box { fill: #ffffff; stroke: #000000; stroke-width: 1.1; rx: 2; }
      .ipo-label { font-family: "Segoe UI", Arial, sans-serif; font-size: 9px; font-weight: 800; fill: #333333; text-anchor: middle; letter-spacing: 0.06em; }
      .ipo-text { font-family: "Segoe UI", Arial, sans-serif; font-size: 10px; font-weight: 500; fill: #000000; text-anchor: middle; }
    </style>
    <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>
  </defs>''')

    # Plain white background - NO borders on image canvas
    svg_lines.append(f'  <rect width="{W}" height="{H}" class="bg" />')

    # ROOT BOX (Level 0)
    root_w = 980
    root_h = 62
    root_x = cx_root - root_w / 2
    root_y = 45
    svg_lines.append(f'  <!-- ROOT LEVEL 0 -->')
    svg_lines.append(f'  <rect x="{root_x}" y="{root_y}" width="{root_w}" height="{root_h}" class="root-box" />')
    svg_lines.append(f'  <text x="{cx_root}" y="{root_y + 26}" class="root-title">CWTSCONNECT: WEB-BASED DECISION SUPPORT AND VOLUNTEER MANAGEMENT SYSTEM</text>')
    svg_lines.append(f'  <text x="{cx_root}" y="{root_y + 47}" class="root-sub">HIERARCHICAL INPUT PROCESS OUTPUT (HIPO) ARCHITECTURE MODEL</text>')

    # MAIN TRUNK LINES
    # Vertical trunk from root down to y=140
    y_trunk1 = 138
    svg_lines.append(f'  <!-- HIERARCHY TREE CONNECTIONS -->')
    svg_lines.append(f'  <line x1="{cx_root}" y1="{root_y + root_h}" x2="{cx_root}" y2="{y_trunk1}" class="line-thick" />')

    # Row 1 Module Column Centers:
    # 3 modules in Row 1: col 0 = 540, col 1 = 1560, col 2 = 2580
    col_centers = [540, 1560, 2580]
    
    # Horizontal bus for Row 1
    svg_lines.append(f'  <line x1="{col_centers[0]}" y1="{y_trunk1}" x2="{col_centers[2]}" y2="{y_trunk1}" class="line-thick" />')

    # Drops from horizontal bus to Row 1 module boxes (y=170)
    y_mod_r1 = 170
    for cx in col_centers:
        svg_lines.append(f'  <line x1="{cx}" y1="{y_trunk1}" x2="{cx}" y2="{y_mod_r1}" class="line-thick" />')

    # Vertical bypass lines feeding Row 2 from the main bus
    # Drop between Mod 1 and Mod 2 at x=1050, and between Mod 2 and Mod 3 at x=2070
    y_trunk2 = 725
    x_drop_l = 1050
    x_drop_r = 2070
    svg_lines.append(f'  <!-- Inter-Row Distribution Trunks -->')
    svg_lines.append(f'  <line x1="{x_drop_l}" y1="{y_trunk1}" x2="{x_drop_l}" y2="{y_trunk2}" class="line-thick" />')
    svg_lines.append(f'  <line x1="{x_drop_r}" y1="{y_trunk1}" x2="{x_drop_r}" y2="{y_trunk2}" class="line-thick" />')
    # Horizontal bus for Row 2 connecting col_centers[0] to col_centers[2]
    svg_lines.append(f'  <line x1="{col_centers[0]}" y1="{y_trunk2}" x2="{col_centers[2]}" y2="{y_trunk2}" class="line-thick" />')
    
    y_mod_r2 = 755
    for cx in col_centers:
        svg_lines.append(f'  <line x1="{cx}" y1="{y_trunk2}" x2="{cx}" y2="{y_mod_r2}" class="line-thick" />')

    # HELPER TO WRAP TEXT
    def wrap_text(text, max_chars=34):
        words = text.split()
        lines = []
        cur = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + (1 if cur else 0) <= max_chars:
                cur.append(w)
                cur_len += len(w) + (1 if len(cur) > 1 else 0)
            else:
                lines.append(" ".join(cur))
                cur = [w]
                cur_len = len(w)
        if cur:
            lines.append(" ".join(cur))
        return lines

    # RENDER EACH MODULE
    for mod in modules:
        row = mod["row_idx"]
        col = mod["col_idx"]
        cx_mod = col_centers[col]
        y_mod = y_mod_r1 if row == 0 else y_mod_r2
        
        # Module Box
        mod_w = 580
        mod_h = 46
        mod_x = cx_mod - mod_w / 2
        svg_lines.append(f'\n  <!-- MODULE {mod["id"]} -->')
        svg_lines.append(f'  <rect x="{mod_x}" y="{y_mod}" width="{mod_w}" height="{mod_h}" class="mod-box" />')
        svg_lines.append(f'  <text x="{cx_mod}" y="{y_mod + 28}" class="mod-title">{mod["name"]}</text>')

        # Sub-process branching
        y_sub_trunk = y_mod + mod_h + 24
        svg_lines.append(f'  <line x1="{cx_mod}" y1="{y_mod + mod_h}" x2="{cx_mod}" y2="{y_sub_trunk}" class="line" />')

        # 3 Sub-processes columns inside 960px width
        x_mod_start = cx_mod - 480
        # Centers of the 3 sub-process columns
        sub_cx_list = [
            x_mod_start + 165,
            x_mod_start + 480,
            x_mod_start + 795
        ]

        # Sub-trunk line connecting the 3 sub-processes
        svg_lines.append(f'  <line x1="{sub_cx_list[0]}" y1="{y_sub_trunk}" x2="{sub_cx_list[2]}" y2="{y_sub_trunk}" class="line" />')

        y_sub_box = y_sub_trunk + 24
        sub_box_w = 282
        sub_box_h = 52

        for s_idx, sp in enumerate(mod["sub_processes"]):
            sub_cx = sub_cx_list[s_idx]
            sub_x = sub_cx - sub_box_w / 2

            # Drop line to sub box
            svg_lines.append(f'  <line x1="{sub_cx}" y1="{y_sub_trunk}" x2="{sub_cx}" y2="{y_sub_box}" class="line" />')

            # Sub-process Box (Level 2)
            svg_lines.append(f'  <rect x="{sub_x}" y="{y_sub_box}" width="{sub_box_w}" height="{sub_box_h}" class="sub-box" />')
            svg_lines.append(f'  <text x="{sub_cx}" y="{y_sub_box + 20}" class="sub-num">{sp["num"]}</text>')
            svg_lines.append(f'  <text x="{sub_cx}" y="{y_sub_box + 38}" class="sub-title">{sp["title"]}</text>')

            # Vertical Stack: INPUT, PROCESS, OUTPUT
            # Dimensions
            ipo_w = 282
            ipo_h = 62
            ipo_gap = 18

            # Input Box
            y_input = y_sub_box + sub_box_h + ipo_gap
            svg_lines.append(f'  <line x1="{sub_cx}" y1="{y_sub_box + sub_box_h}" x2="{sub_cx}" y2="{y_input}" class="line" marker-end="url(#arrow)" />')
            svg_lines.append(f'  <rect x="{sub_x}" y="{y_input}" width="{ipo_w}" height="{ipo_h}" class="ipo-box" />')
            svg_lines.append(f'  <text x="{sub_cx}" y="{y_input + 18}" class="ipo-label">INPUT</text>')
            in_lines = wrap_text(sp["input"], max_chars=34)
            if len(in_lines) == 1:
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_input + 40}" class="ipo-text">{in_lines[0]}</text>')
            else:
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_input + 34}" class="ipo-text">{in_lines[0]}</text>')
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_input + 50}" class="ipo-text">{in_lines[1]}</text>')

            # Process Box
            y_proc = y_input + ipo_h + ipo_gap
            svg_lines.append(f'  <line x1="{sub_cx}" y1="{y_input + ipo_h}" x2="{sub_cx}" y2="{y_proc}" class="line" marker-end="url(#arrow)" />')
            svg_lines.append(f'  <rect x="{sub_x}" y="{y_proc}" width="{ipo_w}" height="{ipo_h}" class="ipo-box" />')
            svg_lines.append(f'  <text x="{sub_cx}" y="{y_proc + 18}" class="ipo-label">PROCESS</text>')
            pr_lines = wrap_text(sp["process"], max_chars=34)
            if len(pr_lines) == 1:
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_proc + 40}" class="ipo-text">{pr_lines[0]}</text>')
            else:
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_proc + 34}" class="ipo-text">{pr_lines[0]}</text>')
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_proc + 50}" class="ipo-text">{pr_lines[1]}</text>')

            # Output Box
            y_out = y_proc + ipo_h + ipo_gap
            svg_lines.append(f'  <line x1="{sub_cx}" y1="{y_proc + ipo_h}" x2="{sub_cx}" y2="{y_out}" class="line" marker-end="url(#arrow)" />')
            svg_lines.append(f'  <rect x="{sub_x}" y="{y_out}" width="{ipo_w}" height="{ipo_h}" class="ipo-box" />')
            svg_lines.append(f'  <text x="{sub_cx}" y="{y_out + 18}" class="ipo-label">OUTPUT</text>')
            out_lines = wrap_text(sp["output"], max_chars=34)
            if len(out_lines) == 1:
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_out + 40}" class="ipo-text">{out_lines[0]}</text>')
            else:
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_out + 34}" class="ipo-text">{out_lines[0]}</text>')
                svg_lines.append(f'  <text x="{sub_cx}" y="{y_out + 50}" class="ipo-text">{out_lines[1]}</text>')

    svg_lines.append('</svg>')
    return "\n".join(svg_lines)

def main():
    svg_content = build_hipo_svg()
    
    # Save SVG
    svg_pub = "public/hipo-model.svg"
    svg_root = "hipo-model.svg"
    with open(svg_pub, "w", encoding="utf-8") as f:
        f.write(svg_content)
    with open(svg_root, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Saved SVG files.")

    # Render PNG at 300 DPI using PyMuPDF
    doc = pymupdf.open("svg", svg_content.encode("utf-8"))
    page = doc[0]
    # Matrix 1.5 -> 3120 * 1.5 = 4680px width (Super crisp 300 DPI)
    matrix = pymupdf.Matrix(1.5, 1.5)
    pix = page.get_pixmap(matrix=matrix, alpha=False)

    png_pub = "public/hipo-model-300dpi.png"
    png_root = "hipo-model-300dpi.png"
    pix.save(png_pub)
    pix.save(png_root)
    print(f"Generated 300 DPI PNG: {pix.width}x{pix.height} px -> {png_root}")

if __name__ == "__main__":
    main()
