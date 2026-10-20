from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--force-device-scale-factor=2.5')
options.add_argument('--window-size=1600,2000')

driver = webdriver.Chrome(options=options)
try:
    driver.get('http://localhost:3001/data-dictionary.html')
    time.sleep(1)
    table = driver.find_element(By.ID, 'table_users')
    table.screenshot('scratch/test_table_users.png')
    print('Successfully captured table_users screenshot!')
except Exception as e:
    print('Error:', e)
finally:
    driver.quit()
