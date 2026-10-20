import os
import html
import xml.etree.ElementTree as ET
import pymupdf
from PIL import Image

def generate_hipo():
    W = 3120
    H = 1320
    cx_root = 1560
    
    def esc(text):
        return html.escape(text)

    # Structure of Modules
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
                    "input": "User Registration Data & Email",
                    "process": "Validate Credentials & Verify 6-digit OTP",
                    "output": "Verified Active User Account Record"
                },
                {
                    "num": "1.2",
                    "title": "Student Profiling & GIS Geotagging",
                    "input": "Student Profile Info, Skills & Address",
                    "process": "Record Academic Info & Geocode Coordinates",
                    "output": "Geotagged Student Profile & GIS Record"
                },
                {
                    "num": "1.3",
                    "title": "Role-Based Access & Session Control",
                    "input": "Login Credentials & User Role Type",
                    "process": "Authenticate Credentials & Issue Token",
                    "output": "Authorized Active User Session"
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
                    "input": "Parent Waiver, Medical Cert & Valid ID",
                    "process": "Validate Formats & Store Document Uploads",
                    "output": "Student Compliance Document Records"
                },
                {
                    "num": "2.2",
                    "title": "Coordinator Review & Verification",
                    "input": "Submitted Student Documents",
                    "process": "Review Authenticity & Verify Status",
                    "output": "Approved Compliance Clearance Record"
                },
                {
                    "num": "2.3",
                    "title": "Compliance Tracking & Alerts",
                    "input": "Verification Status & Eligibility Updates",
                    "process": "Evaluate Eligibility & Trigger Status Alerts",
                    "output": "Deployment Clearance Notification"
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
                    "input": "Community Request Details & Coordinates",
                    "process": "Validate Scope & Log Community Needs",
                    "output": "Pending Community Outreach Request"
                },
                {
                    "num": "3.2",
                    "title": "Proposal Evaluation & Approval",
                    "input": "Pending Community Outreach Requests",
                    "process": "Review Feasibility & Endorse Proposal",
                    "output": "Approved Community Outreach Project"
                },
                {
                    "num": "3.3",
                    "title": "Service & Skills Categorization",
                    "input": "Standard Service Catalog & Required Skills",
                    "process": "Map Community Needs to Skill Categories",
                    "output": "Target Criteria for DSS Matching"
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
                    "input": "Eligible Student Profiles & Coordinates",
                    "process": "Compute Skill Relevance & Proximity Distance",
                    "output": "Ranked Candidate DSS Matching Results"
                },
                {
                    "num": "4.2",
                    "title": "Deployment Roster Formation",
                    "input": "Ranked Student Matches & Volunteer Quota",
                    "process": "Assemble Optimal Volunteer Batch & Assign",
                    "output": "Official Deployment Roster Record"
                },
                {
                    "num": "4.3",
                    "title": "Schedule & Notice Dispatch",
                    "input": "Approved Deployment Schedule & Roster",
                    "process": "Dispatch Schedules to Students & Officials",
                    "output": "Deployment Schedules & Alert Notices"
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
                    "input": "Student Attendance Time Logs & Photo Proof",
                    "process": "Record Daily Attendance & Geotag Verification",
                    "output": "Verified Daily Field Attendance Log"
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
                    "process": "Review Make-Up Excuse & Assign Replacement",
                    "output": "Approved Make-Up Schedule & Hours Log"
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
                    "input": "Barangay Official Rating & Rubrics",
                    "process": "Calculate Student Performance Scores",
                    "output": "Official Student Performance Evaluation"
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
                    "input": "Verified Completion Clearance & Metrics",
                    "process": "Compile Program Analytics & Format Forms",
                    "output": "Completion Certificates & Summary Reports"
                }
            ]
        }
    ]

    col_centers = [540, 1560, 2580]
    y_trunk1 = 144
    y_mod_r1 = 175
    y_trunk2 = 745
    y_mod_r2 = 780

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

    # ==========================================
    # 1. BUILD SVG WITH OFFICIAL THESIS TITLE
    # ==========================================
    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    svg.append(f'''  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
    </marker>
  </defs>''')
    # Plain white background - zero canvas border
    svg.append(f'  <rect x="0" y="0" width="{W}" height="{H}" fill="#ffffff" stroke="none" />')

    # Root Box (Level 0) with official title
    title_line1 = "CWTSCONNECT: A WEB-BASED CWTS COMMUNITY NEEDS MATCHING AND STUDENT DEPLOYMENT SYSTEM"
    title_line2 = "USING A DECISION SUPPORT SYSTEM WITH MONITORING AND ANALYTICS"
    title_line3 = "HIERARCHICAL INPUT PROCESS OUTPUT (HIPO) MODEL"

    root_w = 1180
    root_h = 76
    root_x = cx_root - root_w / 2
    root_y = 40
    svg.append(f'  <!-- ROOT LEVEL 0 (OFFICIAL SYSTEM TITLE) -->')
    svg.append(f'  <rect x="{root_x}" y="{root_y}" width="{root_w}" height="{root_h}" rx="4" fill="#ffffff" stroke="#000000" stroke-width="2.2" />')
    svg.append(f'  <text x="{cx_root}" y="{root_y + 24}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="0.4">{esc(title_line1)}</text>')
    svg.append(f'  <text x="{cx_root}" y="{root_y + 44}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="0.4">{esc(title_line2)}</text>')
    svg.append(f'  <text x="{cx_root}" y="{root_y + 64}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="bold" fill="#444444" text-anchor="middle" letter-spacing="1">{esc(title_line3)}</text>')

    # Main Trunk lines
    svg.append(f'  <!-- HIERARCHY TREE CONNECTIONS -->')
    svg.append(f'  <line x1="{cx_root}" y1="{root_y + root_h}" x2="{cx_root}" y2="{y_trunk1}" stroke="#000000" stroke-width="2" />')
    svg.append(f'  <line x1="{col_centers[0]}" y1="{y_trunk1}" x2="{col_centers[2]}" y2="{y_trunk1}" stroke="#000000" stroke-width="2" />')

    for cx in col_centers:
        svg.append(f'  <line x1="{cx}" y1="{y_trunk1}" x2="{cx}" y2="{y_mod_r1}" stroke="#000000" stroke-width="2" />')

    # Bypass vertical drops feeding Row 2
    x_drop_l = 1050
    x_drop_r = 2070
    svg.append(f'  <!-- ROW 2 BUS FEEDERS -->')
    svg.append(f'  <line x1="{x_drop_l}" y1="{y_trunk1}" x2="{x_drop_l}" y2="{y_trunk2}" stroke="#000000" stroke-width="2" />')
    svg.append(f'  <line x1="{x_drop_r}" y1="{y_trunk1}" x2="{x_drop_r}" y2="{y_trunk2}" stroke="#000000" stroke-width="2" />')
    svg.append(f'  <line x1="{col_centers[0]}" y1="{y_trunk2}" x2="{col_centers[2]}" y2="{y_trunk2}" stroke="#000000" stroke-width="2" />')

    for cx in col_centers:
        svg.append(f'  <line x1="{cx}" y1="{y_trunk2}" x2="{cx}" y2="{y_mod_r2}" stroke="#000000" stroke-width="2" />')

    # Render modules
    for mod in modules:
        row = mod["row_idx"]
        col = mod["col_idx"]
        cx_mod = col_centers[col]
        y_mod = y_mod_r1 if row == 0 else y_mod_r2

        mod_w = 580
        mod_h = 46
        mod_x = cx_mod - mod_w / 2
        svg.append(f'\n  <!-- MODULE {mod["id"]} -->')
        svg.append(f'  <rect x="{mod_x}" y="{y_mod}" width="{mod_w}" height="{mod_h}" rx="3" fill="#f5f5f5" stroke="#000000" stroke-width="1.8" />')
        svg.append(f'  <text x="{cx_mod}" y="{y_mod + 28}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="0.5">{esc(mod["name"])}</text>')

        y_sub_trunk = y_mod + mod_h + 24
        svg.append(f'  <line x1="{cx_mod}" y1="{y_mod + mod_h}" x2="{cx_mod}" y2="{y_sub_trunk}" stroke="#000000" stroke-width="1.5" />')

        x_mod_start = cx_mod - 480
        sub_cx_list = [x_mod_start + 165, x_mod_start + 480, x_mod_start + 795]
        svg.append(f'  <line x1="{sub_cx_list[0]}" y1="{y_sub_trunk}" x2="{sub_cx_list[2]}" y2="{y_sub_trunk}" stroke="#000000" stroke-width="1.5" />')

        y_sub_box = y_sub_trunk + 22
        sub_box_w = 282
        sub_box_h = 52

        for s_idx, sp in enumerate(mod["sub_processes"]):
            sub_cx = sub_cx_list[s_idx]
            sub_x = sub_cx - sub_box_w / 2

            svg.append(f'  <line x1="{sub_cx}" y1="{y_sub_trunk}" x2="{sub_cx}" y2="{y_sub_box}" stroke="#000000" stroke-width="1.5" />')

            # Sub-process box
            svg.append(f'  <rect x="{sub_x}" y="{y_sub_box}" width="{sub_box_w}" height="{sub_box_h}" rx="3" fill="#fafafa" stroke="#000000" stroke-width="1.4" />')
            svg.append(f'  <text x="{sub_cx}" y="{y_sub_box + 20}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="bold" fill="#000000" text-anchor="middle">{esc(sp["num"])}</text>')
            svg.append(f'  <text x="{sub_cx}" y="{y_sub_box + 38}" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="bold" fill="#111111" text-anchor="middle">{esc(sp["title"])}</text>')

            ipo_w = 282
            ipo_h = 60
            ipo_gap = 18

            # INPUT Box
            y_input = y_sub_box + sub_box_h + ipo_gap
            svg.append(f'  <line x1="{sub_cx}" y1="{y_sub_box + sub_box_h}" x2="{sub_cx}" y2="{y_input}" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow)" />')
            svg.append(f'  <rect x="{sub_x}" y="{y_input}" width="{ipo_w}" height="{ipo_h}" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1.1" />')
            svg.append(f'  <text x="{sub_cx}" y="{y_input + 18}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#333333" text-anchor="middle" letter-spacing="0.5">INPUT</text>')
            in_lines = wrap_text(sp["input"], max_chars=34)
            if len(in_lines) == 1:
                svg.append(f'  <text x="{sub_cx}" y="{y_input + 39}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(in_lines[0])}</text>')
            else:
                svg.append(f'  <text x="{sub_cx}" y="{y_input + 33}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(in_lines[0])}</text>')
                svg.append(f'  <text x="{sub_cx}" y="{y_input + 48}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(in_lines[1])}</text>')

            # PROCESS Box
            y_proc = y_input + ipo_h + ipo_gap
            svg.append(f'  <line x1="{sub_cx}" y1="{y_input + ipo_h}" x2="{sub_cx}" y2="{y_proc}" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow)" />')
            svg.append(f'  <rect x="{sub_x}" y="{y_proc}" width="{ipo_w}" height="{ipo_h}" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1.1" />')
            svg.append(f'  <text x="{sub_cx}" y="{y_proc + 18}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#333333" text-anchor="middle" letter-spacing="0.5">PROCESS</text>')
            pr_lines = wrap_text(sp["process"], max_chars=34)
            if len(pr_lines) == 1:
                svg.append(f'  <text x="{sub_cx}" y="{y_proc + 39}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(pr_lines[0])}</text>')
            else:
                svg.append(f'  <text x="{sub_cx}" y="{y_proc + 33}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(pr_lines[0])}</text>')
                svg.append(f'  <text x="{sub_cx}" y="{y_proc + 48}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(pr_lines[1])}</text>')

            # OUTPUT Box
            y_out = y_proc + ipo_h + ipo_gap
            svg.append(f'  <line x1="{sub_cx}" y1="{y_proc + ipo_h}" x2="{sub_cx}" y2="{y_out}" stroke="#000000" stroke-width="1.3" marker-end="url(#arrow)" />')
            svg.append(f'  <rect x="{sub_x}" y="{y_out}" width="{ipo_w}" height="{ipo_h}" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1.1" />')
            svg.append(f'  <text x="{sub_cx}" y="{y_out + 18}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#333333" text-anchor="middle" letter-spacing="0.5">OUTPUT</text>')
            out_lines = wrap_text(sp["output"], max_chars=34)
            if len(out_lines) == 1:
                svg.append(f'  <text x="{sub_cx}" y="{y_out + 39}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(out_lines[0])}</text>')
            else:
                svg.append(f'  <text x="{sub_cx}" y="{y_out + 33}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(out_lines[0])}</text>')
                svg.append(f'  <text x="{sub_cx}" y="{y_out + 48}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="normal" fill="#000000" text-anchor="middle">{esc(out_lines[1])}</text>')

    svg.append('</svg>')
    svg_str = "\n".join(svg)

    # Validate XML with ElementTree
    ET.fromstring(svg_str)
    print("SUCCESS: SVG XML is 100% valid and well-formed!")

    # Save SVG
    with open("public/hipo-model.svg", "w", encoding="utf-8") as f:
        f.write(svg_str)
    with open("hipo-model.svg", "w", encoding="utf-8") as f:
        f.write(svg_str)
    print("SVG saved to public/ and root.")

    # Render PNG at 300 DPI using PyMuPDF
    doc = pymupdf.open("svg", svg_str.encode("utf-8"))
    page = doc[0]
    matrix = pymupdf.Matrix(1.5, 1.5)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    pix.save("public/hipo-model-300dpi.png")
    pix.save("hipo-model-300dpi.png")
    print(f"Generated 300 DPI PNG: {pix.width}x{pix.height} px")

    # Build Draw.io XML
    drawio = []
    drawio.append('<mxfile host="app.diagrams.net" modified="2026-10-13T05:30:00.000Z" agent="Antigravity" version="21.0.0" type="device">')
    drawio.append('  <diagram id="hipo_model" name="HIPO Architecture Model">')
    drawio.append(f'    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{W}" pageHeight="{H}" background="#ffffff" math="0" shadow="0">')
    drawio.append('      <root>')
    drawio.append('        <mxCell id="0" />')
    drawio.append('        <mxCell id="1" parent="0" />')

    cell_id = 100
    cell_id += 1
    root_val = html.escape(f"{title_line1}&#xa;{title_line2}&#xa;{title_line3}")
    drawio.append(f'        <mxCell id="{cell_id}" value="{root_val}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=2.2;fontStyle=1;fontSize=13;fontColor=#000000;align=center;" vertex="1" parent="1">')
    drawio.append(f'          <mxGeometry x="{root_x}" y="{root_y}" width="{root_w}" height="{root_h}" as="geometry" />')
    drawio.append('        </mxCell>')
    root_cid = cell_id

    for mod in modules:
        row = mod["row_idx"]
        col = mod["col_idx"]
        cx_mod = col_centers[col]
        y_mod = y_mod_r1 if row == 0 else y_mod_r2
        mod_w = 580
        mod_h = 46
        mod_x = cx_mod - mod_w / 2

        cell_id += 1
        m_cid = cell_id
        drawio.append(f'        <mxCell id="{m_cid}" value="{html.escape(mod["name"])}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#F5F5F5;strokeColor=#000000;strokeWidth=1.8;fontStyle=1;fontSize=12;fontColor=#000000;align=center;" vertex="1" parent="1">')
        drawio.append(f'          <mxGeometry x="{mod_x}" y="{y_mod}" width="{mod_w}" height="{mod_h}" as="geometry" />')
        drawio.append('        </mxCell>')

        cell_id += 1
        drawio.append(f'        <mxCell id="{cell_id}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.8;endArrow=none;" edge="1" parent="1" source="{root_cid}" target="{m_cid}">')
        drawio.append('          <mxGeometry relative="1" as="geometry" />')
        drawio.append('        </mxCell>')

        x_mod_start = cx_mod - 480
        sub_cx_list = [x_mod_start + 165, x_mod_start + 480, x_mod_start + 795]
        y_sub_box = (y_mod + mod_h + 24) + 22
        sub_box_w = 282
        sub_box_h = 52

        for s_idx, sp in enumerate(mod["sub_processes"]):
            sub_cx = sub_cx_list[s_idx]
            sub_x = sub_cx - sub_box_w / 2

            cell_id += 1
            sp_cid = cell_id
            sp_val = html.escape(f'{sp["num"]}&#xa;{sp["title"]}')
            drawio.append(f'        <mxCell id="{sp_cid}" value="{sp_val}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FAFAFA;strokeColor=#000000;strokeWidth=1.4;fontStyle=1;fontSize=11;fontColor=#000000;align=center;" vertex="1" parent="1">')
            drawio.append(f'          <mxGeometry x="{sub_x}" y="{y_sub_box}" width="{sub_box_w}" height="{sub_box_h}" as="geometry" />')
            drawio.append('        </mxCell>')

            cell_id += 1
            drawio.append(f'        <mxCell id="{cell_id}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.4;endArrow=none;" edge="1" parent="1" source="{m_cid}" target="{sp_cid}">')
            drawio.append('          <mxGeometry relative="1" as="geometry" />')
            drawio.append('        </mxCell>')

            ipo_w = 282
            ipo_h = 60
            ipo_gap = 18

            # Input
            cell_id += 1
            in_cid = cell_id
            in_val = html.escape(f'INPUT&#xa;{sp["input"]}')
            y_input = y_sub_box + sub_box_h + ipo_gap
            drawio.append(f'        <mxCell id="{in_cid}" value="{in_val}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.1;fontSize=10;fontColor=#000000;align=center;" vertex="1" parent="1">')
            drawio.append(f'          <mxGeometry x="{sub_x}" y="{y_input}" width="{ipo_w}" height="{ipo_h}" as="geometry" />')
            drawio.append('        </mxCell>')

            cell_id += 1
            drawio.append(f'        <mxCell id="{cell_id}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1.2;endArrow=classic;endFill=1;" edge="1" parent="1" source="{sp_cid}" target="{in_cid}">')
            drawio.append('          <mxGeometry relative="1" as="geometry" />')
            drawio.append('        </mxCell>')

            # Process
            cell_id += 1
            pr_cid = cell_id
            pr_val = html.escape(f'PROCESS&#xa;{sp["process"]}')
            y_proc = y_input + ipo_h + ipo_gap
            drawio.append(f'        <mxCell id="{pr_cid}" value="{pr_val}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.1;fontSize=10;fontColor=#000000;align=center;" vertex="1" parent="1">')
            drawio.append(f'          <mxGeometry x="{sub_x}" y="{y_proc}" width="{ipo_w}" height="{ipo_h}" as="geometry" />')
            drawio.append('        </mxCell>')

            cell_id += 1
            drawio.append(f'        <mxCell id="{cell_id}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1.2;endArrow=classic;endFill=1;" edge="1" parent="1" source="{in_cid}" target="{pr_cid}">')
            drawio.append('          <mxGeometry relative="1" as="geometry" />')
            drawio.append('        </mxCell>')

            # Output
            cell_id += 1
            out_cid = cell_id
            out_val = html.escape(f'OUTPUT&#xa;{sp["output"]}')
            y_out = y_proc + ipo_h + ipo_gap
            drawio.append(f'        <mxCell id="{out_cid}" value="{out_val}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.1;fontSize=10;fontColor=#000000;align=center;" vertex="1" parent="1">')
            drawio.append(f'          <mxGeometry x="{sub_x}" y="{y_out}" width="{ipo_w}" height="{ipo_h}" as="geometry" />')
            drawio.append('        </mxCell>')

            cell_id += 1
            drawio.append(f'        <mxCell id="{cell_id}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=1.2;endArrow=classic;endFill=1;" edge="1" parent="1" source="{pr_cid}" target="{out_cid}">')
            drawio.append('          <mxGeometry relative="1" as="geometry" />')
            drawio.append('        </mxCell>')

    drawio.append('      </root>')
    drawio.append('    </mxGraphModel>')
    drawio.append('  </diagram>')
    drawio.append('</mxfile>')

    with open("public/hipo-model.drawio", "w", encoding="utf-8") as f:
        f.write("\n".join(drawio))
    with open("hipo-model.drawio", "w", encoding="utf-8") as f:
        f.write("\n".join(drawio))
    print("Draw.io files saved.")

if __name__ == "__main__":
    generate_hipo()
