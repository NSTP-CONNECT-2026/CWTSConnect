from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time

options = Options()
options.add_argument('--headless=new')
options.add_argument('--disable-gpu')
options.add_argument('--window-size=1600,1200')

driver = webdriver.Chrome(options=options)
try:
    driver.get('http://localhost:3001/hipo.html')
    time.sleep(1.5)
    img = driver.find_element(By.ID, 'diagramImg')
    natural_w = driver.execute_script('return arguments[0].naturalWidth;', img)
    natural_h = driver.execute_script('return arguments[0].naturalHeight;', img)
    complete = driver.execute_script('return arguments[0].complete;', img)
    src = img.get_attribute('src')
    alt = img.get_attribute('alt')
    print(f'Image Loaded: complete={complete}, naturalWidth={natural_w}, naturalHeight={natural_h}')
    print(f'Image src={src}, alt="{alt}"')
    
    canvas = driver.find_element(By.CLASS_NAME, 'canvas-card')
    canvas.screenshot('scratch/verify_canvas_card.png')
    print('Screenshot saved to scratch/verify_canvas_card.png')
finally:
    driver.quit()
