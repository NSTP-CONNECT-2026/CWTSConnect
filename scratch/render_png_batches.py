import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image

groups = [
    {
        "id": 1,
        "name": "Part 1 (Tables 1-3: users, student_profiles, otp_verifications)",
        "container_id": "group-container-1",
        "filename": "data-dictionary-part1-tables-1-to-3.png"
    },
    {
        "id": 2,
        "name": "Part 2 (Tables 4-6: student_cmo_requirements, community_requests, request_types)",
        "container_id": "group-container-2",
        "filename": "data-dictionary-part2-tables-4-to-6.png"
    },
    {
        "id": 3,
        "name": "Part 3 (Tables 7-9: skills, dss_match_results, deployments)",
        "container_id": "group-container-3",
        "filename": "data-dictionary-part3-tables-7-to-9.png"
    },
    {
        "id": 4,
        "name": "Part 4 (Tables 10-12: deployment_students, attendance_records, rendered_hours_summary)",
        "container_id": "group-container-4",
        "filename": "data-dictionary-part4-tables-10-to-12.png"
    },
    {
        "id": 5,
        "name": "Part 5 (Tables 13-15: make_up_requests, student_evaluations, student_feedback)",
        "container_id": "group-container-5",
        "filename": "data-dictionary-part5-tables-13-to-15.png"
    },
    {
        "id": 6,
        "name": "Part 6 (Tables 16-17: notifications, notification_preferences)",
        "container_id": "group-container-6",
        "filename": "data-dictionary-part6-tables-16-to-17.png"
    }
]

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--force-device-scale-factor=2.5')
options.add_argument('--window-size=1600,3000')

print("Starting Chrome in headless mode with 2.5x scale (300 DPI equivalent)...")
driver = webdriver.Chrome(options=options)

try:
    url = 'http://localhost:3001/data-dictionary.html'
    print(f"Loading {url}...")
    driver.get(url)
    time.sleep(2)

    for g in groups:
        cid = g["container_id"]
        fname = g["filename"]
        pub_path = os.path.join("public", fname)
        root_path = fname

        print(f"\nProcessing {g['name']}...")
        elem = driver.find_element(By.ID, cid)

        # Scroll into view and pause briefly for repainting
        driver.execute_script("arguments[0].scrollIntoView(true);", elem)
        time.sleep(0.5)

        # Take screenshot
        elem.screenshot(pub_path)
        elem.screenshot(root_path)

        # Verify with PIL
        img = Image.open(pub_path)
        size_kb = os.path.getsize(pub_path) / 1024
        print(f"-> Saved {fname}: {img.size[0]}x{img.size[1]} px ({size_kb:.1f} KB)")

    print("\nAll 6 PNG batches successfully generated and verified!")

except Exception as e:
    print(f"Error during rendering: {e}")
finally:
    driver.quit()
