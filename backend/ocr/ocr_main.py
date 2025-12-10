
import sys
import os
import shutil
import json
import uuid
import traceback
import re
import io
import asyncio
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from fastapi import Form, WebSocket, WebSocketDisconnect
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from PIL import Image, ImageDraw
import cv2
import numpy as np
import torch
from tqdm import tqdm
from collections import defaultdict
from .. import models, database
from ..database import get_db, SessionLocal
from pydantic import BaseModel
from itertools import groupby
from sqlalchemy import func
from ..models import Ticket, User, SubmissionStatus
from ..websocket_manager import manager
# Add backend folder to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- AI Model Setup ---
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from ultralytics import YOLO

# Path to your custom YOLOv8 model
YOLO_MODEL_PATH = os.path.join(os.path.dirname(__file__), "best.pt")

# --- File Storage Setup ---
TICKETS_DIR = r"C:\Mluis\WebApp\backend\tickets"
DEBUG_DIR = r"C:\Mluis\WebApp\backend\ocr\debug_output"
PDF_TICKETS_DIR = r"C:\Mluis\WebApp\backend\ticket_pdfs"
os.makedirs(DEBUG_DIR, exist_ok=True)
os.makedirs(PDF_TICKETS_DIR, exist_ok=True)

# Router setup
router = APIRouter(prefix="/api/ocr", tags=["OCR"])

# --- AI Model Loading ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# ... (Model loading code is unchanged) ...
print("Loading Hugging Face TrOCR model...")
processor = TrOCRProcessor.from_pretrained('microsoft/trocr-large-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-large-handwritten').to(device)
print("✅ TrOCR model loaded successfully.")

print("Loading custom YOLOv8 model for table cell detection...")
if not os.path.exists(YOLO_MODEL_PATH):
    print(f"❌ CRITICAL ERROR: YOLO model not found at '{YOLO_MODEL_PATH}'")
    yolo_model = None
else:
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print("✅ Custom YOLOv8 model loaded successfully.")

@router.websocket("/ws/{foreman_id}")
async def websocket_endpoint(websocket: WebSocket, foreman_id: int):
    await manager.connect(foreman_id, websocket)
    print(f"WebSocket connected for foreman {foreman_id}")
    try:
        while True:
            # Waits for "ping" messages from the React app to keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        # ✅ CRITICAL CHANGE HERE: 
        # Pass 'websocket' so the manager knows WHICH connection dropped.
        # This prevents an old closed tab from killing a new active connection.
        manager.disconnect(foreman_id, websocket)
        print(f"WebSocket disconnected for foreman {foreman_id}")

# --------------------------------------------------------
# --- HELPER FUNCTIONS ---
# --------------------------------------------------------

def run_batch_ocr(image_list: List[Image.Image]) -> List[str]:
    if not image_list:
        return []
    try:
        pixel_values = processor(
            images=image_list, 
            return_tensors="pt"
        ).pixel_values.to(device)
        generated_ids = model.generate(pixel_values, max_length=300)
        all_texts = processor.batch_decode(
            generated_ids, 
            skip_special_tokens=True
        )
        return [text.strip() for text in all_texts]
    except Exception as e:
        print(f"❌ Error during batch OCR: {e}")
        traceback.print_exc()
        return [""] * len(image_list)

def correct_currency_symbols(text: str) -> str:
    text = re.sub(r'\b[sS][oO0]?(?=\s?[\d.])', '$', text)
    text = re.sub(r'(?<=\d)[oO](?=\d)', '0', text)
    return text

def sanitize_filename(filename: str) -> str:
    if not filename:
        return "default"
    sanitized = re.sub(r'[\\/*?:"<>| \']', '_', filename)
    sanitized = sanitized.strip("._")
    if not sanitized:
        return "file"
    return sanitized[:100]

def basic_preprocess(image: Image.Image) -> Image.Image:
    open_cv_image = np.array(image.convert("RGB"))
    open_cv_image = open_cv_image[:, :, ::-1].copy()
    gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, binarized = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    if np.mean(binarized) < 128:
        binarized = cv2.bitwise_not(binarized)
    final_image_rgb = cv2.cvtColor(binarized, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(final_image_rgb)

def remove_lines(image: Image.Image) -> Image.Image:
    binarized = np.array(image.convert("L"))
    inverted_binarized = cv2.bitwise_not(binarized)
    h_kernel_width = max(50, binarized.shape[1] // 30)
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_kernel_width, 1))
    detected_horizontal_lines = cv2.morphologyEx(
        inverted_binarized, cv2.MORPH_OPEN, horizontal_kernel, iterations=2
    )
    dilated_horizontal_lines = cv2.dilate(
        detected_horizontal_lines, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)), iterations=1
    )
    v_kernel_height = max(50, binarized.shape[0] // 30)
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_kernel_height))
    detected_vertical_lines = cv2.morphologyEx(
        inverted_binarized, cv2.MORPH_OPEN, vertical_kernel, iterations=2
    )
    dilated_vertical_lines = cv2.dilate(
        detected_vertical_lines, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)), iterations=1
    )
    all_lines_mask = cv2.add(dilated_horizontal_lines, dilated_vertical_lines)
    cleaned_inverted = cv2.subtract(inverted_binarized, all_lines_mask)
    final_binarized = cv2.bitwise_not(cleaned_inverted)
    final_image_rgb = cv2.cvtColor(final_binarized, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(final_image_rgb)

def enhance_cell_image(cell_cv_image):
    if cell_cv_image.shape[0] < 10 or cell_cv_image.shape[1] < 10:
        return None
    if len(cell_cv_image.shape) == 3 and cell_cv_image.shape[2] == 3:
        gray = cv2.cvtColor(cell_cv_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = cell_cv_image
    target_height = 64
    aspect_ratio = target_height / gray.shape[0]
    new_width = int(gray.shape[1] * aspect_ratio)
    interp = cv2.INTER_CUBIC if aspect_ratio > 1 else cv2.INTER_AREA
    resized = cv2.resize(gray, (new_width, target_height), interpolation=interp)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    contrasted = clahe.apply(resized)
    _, binarized_image = cv2.threshold(contrasted, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.mean(binarized_image) < 128:
        binarized_image = cv2.bitwise_not(binarized_image)
    num_black_pixels = np.sum(binarized_image == 0)
    total_pixels = binarized_image.shape[0] * binarized_image.shape[1]
    if total_pixels == 0:
        return None
    text_percentage = num_black_pixels / total_pixels
    if text_percentage < 0.015: 
        return None
    final_image_rgb = cv2.cvtColor(binarized_image, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(final_image_rgb)

def get_y_overlap(box1, box2):
    b1_top, b1_bottom = box1[1], box1[3]
    b2_top, b2_bottom = box2[1], box2[3]
    overlap_top = max(b1_top, b2_top)
    overlap_bottom = min(b1_bottom, b2_bottom)
    overlap_height = max(0, overlap_bottom - overlap_top)
    if overlap_height == 0:
        return 0
    min_height = min(b1_bottom - b1_top, b2_bottom - b2_top)
    if min_height == 0:
        return 0
    return overlap_height / min_height



# ------------------------------------------------------------------- #
# --- TABLE EXTRACTION (YOLO) - WITH INDIVIDUAL CELL SAVING ---
# ------------------------------------------------------------------- #

def extract_table_data_yolo(image: Image.Image, debug_dir_path: str):
    print("Running primary table extraction with YOLO...")
    if yolo_model is None: return None
    original_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    h, w, _ = original_cv.shape
    
    # Predict using YOLO
    results = yolo_model.predict(original_cv, conf=0.7, verbose=False) 
    if not results or not results[0].boxes: return None
    
    cell_boxes = results[0].boxes.xyxy.cpu().numpy().astype(int).tolist()
    if not cell_boxes: return None

    # --- STEP 1: Sort Boxes Top-to-Bottom ---
    cell_boxes.sort(key=lambda b: (b[1] + b[3]) / 2)

    # --- STEP 2: Group Cells into Rows ---
    rows = []
    current_row = []
    last_y_center = -1
    
    heights = [b[3] - b[1] for b in cell_boxes]
    avg_cell_height = sum(heights) / len(heights) if heights else 30
    row_threshold = avg_cell_height * 0.5 

    for box in cell_boxes:
        y_center = (box[1] + box[3]) / 2
        if last_y_center == -1 or abs(y_center - last_y_center) < row_threshold: 
            current_row.append(box)
        else:
            current_row.sort(key=lambda b: b[0]) 
            rows.append(current_row)
            current_row = [box]
        last_y_center = y_center
        
    if current_row:
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)

    # --- STEP 3: Vertical Clustering (Filter Isolated Boxes) ---
    table_blocks = [] 
    current_block = []
    GAP_THRESHOLD = max(25, avg_cell_height * 0.6) 
    previous_row_bottom = -1

    for row in rows:
        row_top = min(b[1] for b in row)
        row_bottom = max(b[3] for b in row)
        
        if previous_row_bottom == -1:
            current_block.append(row)
        else:
            gap = row_top - previous_row_bottom
            if gap < GAP_THRESHOLD:
                current_block.append(row)
            else:
                table_blocks.append(current_block)
                current_block = [row]
        previous_row_bottom = row_bottom

    if current_block:
        table_blocks.append(current_block)

    # --- STEP 4: Select the "Dominant" Block ---
    if not table_blocks: return None
    main_table_rows = max(table_blocks, key=lambda block: sum(len(r) for r in block))
    print(f"DEBUG: Found {len(table_blocks)} blocks. Selected main table with {len(main_table_rows)} rows.")

    # --- STEP 5: Visualization (Draw Red Boxes) ---
    draw_img = image.copy()
    draw = ImageDraw.Draw(draw_img)
    for row in main_table_rows:
        for box in row:
            x1, y1, x2, y2 = box
            draw.rectangle([x1, y1, x2, y2], outline="red", width=3)
    
    debug_path = os.path.join(debug_dir_path, "3_detected_cells_on_original.png")
    draw_img.save(debug_path)
    print(f"✅ Debug image saved to: {debug_path}")

    # --- STEP 6: Re-calculate Table Bounding Box ---
    all_main_boxes = [box for row in main_table_rows for box in row]
    min_x = max(0, min(b[0] for b in all_main_boxes) - 10)
    min_y = max(0, min(b[1] for b in all_main_boxes) - 10)
    max_x = min(w, max(b[2] for b in all_main_boxes) + 10)
    max_y = min(h, max(b[3] for b in all_main_boxes) + 10)
    table_bbox = [min_x, min_y, max_x, max_y]

    # --- STEP 7: Extract Images & OCR (WITH SAVING) ---
    cleaned_pil = remove_lines(image)
    cleaned_cv = cv2.cvtColor(np.array(cleaned_pil), cv2.COLOR_RGB2BGR)
    
    cell_images = []
    cell_coords = []
    max_cols = len(max(main_table_rows, key=len)) if main_table_rows else 0
    table_grid = [["" for _ in range(max_cols)] for _ in range(len(main_table_rows))]

    for r_idx, row_boxes in enumerate(main_table_rows):
        for c_idx, box in enumerate(row_boxes):
            x1, y1, x2, y2 = box
            cell_roi = cleaned_cv[max(0, y1-2):min(h, y2+2), max(0, x1-2):min(w, x2+2)]
            enhanced = enhance_cell_image(cell_roi)
            if enhanced:
                # 🟢 RESTORED: Save individual cell image
                save_path = os.path.join(debug_dir_path, f"cell_{r_idx}_{c_idx}.png")
                enhanced.save(save_path)
                
                cell_images.append(enhanced)
                cell_coords.append((r_idx, c_idx))

    if cell_images:
        texts = run_batch_ocr(cell_images)
        for (r, c), text in zip(cell_coords, texts):
            if c < len(table_grid[r]):
                table_grid[r][c] = text
            else:
                table_grid[r].append(text)

    return {"extracted_table": table_grid, "table_bbox": table_bbox}
# ------------------------------------------------------------------- #
# --- CELL SEGMENTATION ---
# ------------------------------------------------------------------- #

def extract_lines_data(cv_image: np.ndarray, unique_filename: str):
    try:
        print("Segmenting non-table text...")
        cell_data_by_row = segment_lines(cv_image, None)
        if not cell_data_by_row: 
            print("No non-table text found after segmentation.")
            return None
        line_images_to_process = []; line_positions = []
        all_extracted_lines = [None] * len(cell_data_by_row)
        total_cells = 0
        for i, row_data in enumerate(cell_data_by_row):
            all_extracted_lines[i] = {"row_text": [""] * len(row_data["images"]), "y": row_data["y"]}
            for j, image in enumerate(row_data["images"]):
                line_images_to_process.append(image); line_positions.append((i, j)); total_cells += 1
        print(f"Contour OCR started on {len(cell_data_by_row)} lines ({total_cells} cells)...")
        if line_images_to_process:
            all_texts = run_batch_ocr(line_images_to_process)
            print("Mapping batch results back to line structure...")
            for idx, text in enumerate(all_texts):
                row_idx, col_idx = line_positions[idx]
                if row_idx < len(all_extracted_lines) and col_idx < len(all_extracted_lines[row_idx]["row_text"]):
                    all_extracted_lines[row_idx]["row_text"][col_idx] = text
                else:
                    print(f"Warning: Index mismatch in line data for row {row_idx}")
        return {"all_lines": all_extracted_lines}
    finally:
        pass

def segment_lines(cv_image: np.ndarray, output_dir):
    image = cv_image
    if image is None: 
        print("Segment_lines: Image is None."); return []
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.mean(binary_otsu) < 128:
        binary_otsu = cv2.bitwise_not(binary_otsu)
    binary = cv2.bitwise_not(binary_otsu)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: 
        print("Segment_lines: No contours found."); return []
    word_boxes = [cv2.boundingRect(c) for c in contours if cv2.contourArea(c) > 15]
    if not word_boxes: 
        print("Segment_lines: No word boxes found after filtering contours (area < 15)."); return []
    word_boxes.sort(key=lambda b: b[1])
    lines_data = []; current_line = []
    if word_boxes:
        current_line.append(word_boxes[0])
        sample_heights = [h for _, _, _, h in word_boxes[:50]]
        avg_height = np.mean(sample_heights) if sample_heights else 20
        for box in word_boxes[1:]:
            last_box_y_center = current_line[-1][1] + current_line[-1][3] / 2
            current_box_y_center = box[1] + box[3] / 2
            if abs(current_box_y_center - last_box_y_center) < avg_height * 1.0:
                current_line.append(box)
            else:
                sorted_line_boxes = sorted(current_line, key=lambda b: b[0])
                lines_data.append({"boxes": sorted_line_boxes, "y": sorted_line_boxes[0][1]})
                current_line = [box]
        if current_line:
            sorted_line_boxes = sorted(current_line, key=lambda b: b[0])
            lines_data.append({"boxes": sorted_line_boxes, "y": sorted_line_boxes[0][1]})
    all_lines_data = []; all_widths = []
    for _, _, w, h in word_boxes:
        if h > avg_height * 0.5: all_widths.append(w)
    avg_char_width = np.mean(all_widths) if all_widths else 10
    gap_threshold = avg_char_width * 2.0 
    for line_data in lines_data:
        line = line_data["boxes"]; line_y = line_data["y"]
        if not line: continue
        cells_in_line = []; current_cell_boxes = [line[0]] 
        for i in range(len(line) - 1):
            current_word_box = line[i]; next_word_box = line[i+1]
            gap = next_word_box[0] - (current_word_box[0] + current_word_box[2])
            if gap > gap_threshold:
                cells_in_line.append(current_cell_boxes); current_cell_boxes = [next_word_box]
            else:
                current_cell_boxes.append(next_word_box)
        cells_in_line.append(current_cell_boxes)
        all_lines_data.append({"line_cell_boxes": cells_in_line, "y": line_y})
    return crop_cells_to_memory(image, all_lines_data)

def crop_cells_to_memory(image, all_lines_data):
    final_lines = []
    padding = 10
    for i, line_data in enumerate(all_lines_data):
        cell_images_in_row = []; line_y = line_data["y"]
        for j, cell_boxes in enumerate(line_data["line_cell_boxes"]):
            if not cell_boxes: continue
            x_min = min(b[0] for b in cell_boxes); y_min = min(b[1] for b in cell_boxes)
            x_max = max(b[0] + b[2] for b in cell_boxes); y_max = max(b[1] + b[3] for b in cell_boxes)
            y1, y2 = max(0, y_min - padding), min(image.shape[0], y_max + padding)
            x1, x2 = max(0, x_min - padding), min(image.shape[1], x_max + padding)
            cell_img_np = image[y1:y2, x1:x2]
            if cell_img_np.size > 0:
                cell_pil = Image.fromarray(cv2.cvtColor(cell_img_np, cv2.COLOR_BGR2RGB))
                cell_images_in_row.append(cell_pil)
        if cell_images_in_row:
            final_lines.append({"images": cell_images_in_row, "y": line_y})
    return final_lines

# ------------------------------------------------------------------- #
# --- STRUCTURED DATA EXTRACTOR ---
# ------------------------------------------------------------------- #

def extract_structured_data(raw_text: str) -> dict:
    print("Extracting structured data from raw text...")
    
    def clean_value(value: str):
        if not value: return None
        return value.strip(" :-\n\t").strip()

    results = {
        "ticket_number": None, "ticket_date": None, "haul_vendor": None,
        "truck_number": None, "material": None, "job_number": None,
        "phase_code_": None, "zone": None, "hours": None,
    }

    # --- SET 1: Simple Patterns (Fast, Same-Line Strict) ---
    patterns = {
        "ticket_number": r'(?i)(?:Ticket Number|Ticket#|TICKET NO|Ticket #|Invoice #|Invoice#)\s*[:\-]?\s*([A-Za-z0-9\-]+)',
        "ticket_date":   r'(?i)(?:Date)\s*[:\-]?\s*([\d\/\-]{6,10})', 
        "haul_vendor":   r'(?i)(?:Haul Vendor|Vendor)\s*[:\-]?\s*([A-Za-z&][A-Za-z\s&]*)',
        "truck_number":  r'(?i)(?:Truck Number|Truck No|Truck #|Truck)\s*[:\-]?\s*([A-Za-z0-9\-]+)',
        "material":      r'(?i)(?:Material\s+hauled)\s*[:\-]?\s*([A-Za-z\d\-][A-Za-z\s\d\-]*)',
        "job_number":    r'(?i)(?:Job Number|Job No|Job #)\s*[:\-]?\s*([A-Za-z0-9\-]+)',
        "phase_code_":   r'(?i)(?:Phase Code)\s*[:\-]?\s*([A-Za-z0-9\-]+)',
        "zone":          r'(?i)(?:Zone)\s*[:\-]?\s*([A-Za-z0-9\-]+)',
        "hours":         r'(?i)(?:Hours)\s*[:\-]?\s*([\d\.]+(?:\s?hrs)?)'
    }

    for field, pattern in patterns.items():
        match = re.search(pattern, raw_text)
        if match:
            value = clean_value(match.group(1))
            results[field] = value

    # --- SET 2: Multi-find Patterns (Robust, Table/Next-Line) ---
    multi_find_patterns = {
        "ticket_number": (r'(?i)(?:Ticket Number|Ticket#|TICKET NO|Ticket #|Invoice #|Invoice#|Ticket # )', r'([A-Za-z0-9\-]+)'),
        "ticket_date":   (r'(?i)(?:Date)', r'([\d\/\-]{6,10})'),
        "haul_vendor":   (r'(?i)(?:Haul Vendor|Vendor)', r'([A-Za-z&][A-Za-z\s&]*)'),
        "truck_number":  (r'(?i)(?:Truck Number|Truck No|Truck #|Truck)', r'([A-Za-z0-9\-]+)'),
        "material":      (r'(?i)(?:Material\s+hauled)', r'([A-Za-z\d\-][A-Za-z\s\d\-]*)'),
        "job_number":    (r'(?i)(?:Job Number|Job No|Job #)', r'([A-Za-z0-9\-]+)'),
        "phase_code_":   (r'(?i)(?:Phase Code)', r'([A-Za-z0-9\-]+)'),
        "zone":          (r'(?i)(?:Zone)', r'([A-Za-z0-9\-]+)'),
        "hours":         (r'(?i)(?:Hours)', r'([\d\.]+(?:\s?hrs)?)')
    }

    rows = raw_text.split('\n')
    
    for field, (key_pattern, value_pattern) in multi_find_patterns.items():
        if results[field] is None:
            try:
                key_re = re.compile(key_pattern)
                value_re = re.compile(value_pattern)

                for i, row in enumerate(rows):
                    cells = row.split('|')
                    for j, cell in enumerate(cells):
                        if key_re.search(cell):
                            search_area = cell[key_re.search(cell).end():]
                            same_cell_match = value_re.search(search_area)
                            if same_cell_match:
                                val = clean_value(same_cell_match.group(1))
                                if val: 
                                    results[field] = val
                                    break
                            elif (j + 1) < len(cells):
                                next_cell = cells[j + 1]
                                val_match = value_re.search(next_cell)
                                if val_match:
                                    val = clean_value(val_match.group(1))
                                    if val: 
                                        results[field] = val
                                        break
                    if results[field]: break 
                    if results[field] is None and key_re.search(row):
                         if (i + 1) < len(rows):
                            next_row = rows[i + 1]
                            if not re.match(r'(?i)(?:Date|Ticket|Truck|Job|Vendor)', next_row):
                                val_match = value_re.search(next_row)
                                if val_match:
                                    val = clean_value(val_match.group(1))
                                    if val:
                                        results[field] = val
                                        break
            except Exception as e:
                print(f"⚠️ Error searching for {field}: {e}")

    # --- Fallback Patterns ---
    fallback_patterns = {"ticket_date": r'(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})'}
    for field, pattern in fallback_patterns.items():
        if results[field] is None:
            match = re.search(pattern, raw_text)
            if match:
                results[field] = clean_value(match.group(1))

    if results["haul_vendor"]: 
        results["haul_vendor"] = results["haul_vendor"].split('\n')[0].strip()
    if results["hours"]:
        if isinstance(results["hours"], str): 
            results["hours"] = re.sub(r'[^0-9\.]', '', results["hours"])
        try: 
            results["hours"] = float(results["hours"])
        except (ValueError, TypeError): 
            results["hours"] = None

    print(f"Structured data results: {results}")
    return results

# ------------------------------------------------------------------- #
# --- *** BACKGROUND TASK (UPDATED WITH SANDWICH METHOD) *** ---
# ------------------------------------------------------------------- #

def process_scan_in_background(
    file_contents_list: List[Tuple[str, bytes]], 
    foreman_id: int, 
    timesheet_id: int,
    category: str,       # 👈 Add this
    sub_category: str
):
    db = SessionLocal()
    try:
        # --- 1. SETUP & VALIDATION ---
        foreman = db.query(models.User).filter(models.User.id == foreman_id).first()
        timesheet = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
        
        if not foreman or not timesheet:
            print(f"❌ BACKGROUND ERROR: Foreman {foreman_id} or Timesheet {timesheet_id} not found.")
            return

        print(f"✅ BACKGROUND TASK: Started processing for Foreman {foreman.username}, Timesheet {timesheet.id}")
        
        sane_username = sanitize_filename(foreman.username)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        internal_unique_id = f"{timestamp}_{sane_username}"
        
        debug_scan_dir = os.path.join(DEBUG_DIR, internal_unique_id)
        os.makedirs(debug_scan_dir, exist_ok=True)
        
        all_pages_pil_images = []
        all_pages_final_rows = []

        print(f"Processing {len(file_contents_list)} file(s) for batch {internal_unique_id}...")
        
        # --- 2. IMAGE PROCESSING LOOP ---
        for index, (filename, file_content) in enumerate(file_contents_list):
            print(f"--- Processing Page {index + 1} of {len(file_contents_list)} ---")
            page_debug_dir = os.path.join(debug_scan_dir, f"page_{index+1}")
            os.makedirs(page_debug_dir, exist_ok=True)
            
            original_image_pil = Image.open(io.BytesIO(file_content)).convert("RGB")
            all_pages_pil_images.append(original_image_pil)
            
            # Preprocessing
            print("Preprocessing image (basic)...")
            basic_processed_pil = basic_preprocess(original_image_pil.copy())
            basic_processed_pil.save(os.path.join(page_debug_dir, "0_basic_processed.png"), format='PNG')
            
            # Extract Table (YOLO)
            table_result = extract_table_data_yolo(basic_processed_pil, page_debug_dir)
            image_for_contours = basic_processed_pil.copy()
            table_data = None
            table_y_start = float('inf')
            
            if table_result:
                print("✅ Table found via YOLO!")
                table_data = table_result["extracted_table"]
                table_bbox = table_result["table_bbox"]
                table_y_start = table_bbox[1]
                
                # Erase table for contour detection
                draw = ImageDraw.Draw(image_for_contours)
                draw.rectangle(table_bbox, fill="white")
                image_for_contours.save(os.path.join(page_debug_dir, "4_erased_table_from_basic.png"))
            else: 
                print("⚠️ No table found via YOLO for this page.")
            
            # Extract Lines (Contours)
            print("Applying line removal to non-table areas...")
            image_for_contours_cleaned_pil = remove_lines(image_for_contours)
            image_for_contours_cleaned_pil.save(os.path.join(page_debug_dir, "5_image_for_contours_CLEANED.png"), format='PNG')
            image_for_contours_cleaned_cv = cv2.cvtColor(np.array(image_for_contours_cleaned_pil), cv2.COLOR_RGB2BGR)
            
            print("--- Calling extract_lines_data (non-table text) IN-MEMORY ---")
            line_result = extract_lines_data(image_for_contours_cleaned_cv, f"{internal_unique_id}_page_{index+1}") 
            
            contour_lines = []
            if line_result and line_result.get("all_lines"):
                print(f"✅ Contour extraction found {len(line_result['all_lines'])} lines.")
                contour_lines = line_result["all_lines"]
            elif not table_data:
                print("⚠️ No text (table or contour) found on this page.")
                continue 
            
            # Merge Data (Visual Order)
            page_final_data_rows = []
            table_inserted = False
            
            for line in contour_lines:
                if not table_inserted and table_data and line["y"] >= table_y_start:
                    page_final_data_rows.extend(table_data)
                    table_inserted = True
                page_final_data_rows.append(line["row_text"])
            
            if not table_inserted and table_data: 
                page_final_data_rows.extend(table_data)
            
            if not page_final_data_rows:
                print("⚠️ Page processing resulted in empty content.")
                continue

            all_pages_final_rows.append({"page": index + 1, "rows": page_final_data_rows})
        
        if not all_pages_pil_images:
            print("❌ BACKGROUND ERROR: No valid images were processed.")
            return
        
        # --- 3. PDF GENERATION ---
        print("Creating combined PDF...")
        pdf_filename = f"{internal_unique_id}.pdf"
        pdf_path_local = os.path.join(PDF_TICKETS_DIR, pdf_filename)
        pdf_url_path = f"/media/ticket_pdfs/{pdf_filename}"
        
        first_image = all_pages_pil_images[0]
        other_images = all_pages_pil_images[1:]
        first_image.save(pdf_path_local, "PDF", resolution=100.0, save_all=True, append_images=other_images)
        print(f"✅ PDF saved to {pdf_path_local}")
        
        if not os.path.exists(pdf_path_local) or os.path.getsize(pdf_path_local) == 0:
            print(f"❌ CRITICAL ERROR: PDF file was not created.")
            return 
        
        # --- 4. DATA SEPARATION (SANDWICH LOGIC) ---
        full_text_for_ai = ""   
        final_table_rows = []   
        removed_lines = []      

        for page_data in all_pages_final_rows:
            page_header = f"--- PAGE {page_data['page']} ---"
            removed_lines.append(page_header)
            full_text_for_ai += f"\n{page_header}\n"

            rows = page_data["rows"]
            
            # Identify Table boundaries
            strong_row_indices = []
            for i, row in enumerate(rows):
                non_empty_count = len([c for c in row if c and str(c).strip()])
                if non_empty_count >= 4:
                    strong_row_indices.append(i)

            table_start_idx = strong_row_indices[0] if strong_row_indices else -1
            table_end_idx = strong_row_indices[-1] if strong_row_indices else -1
            max_cols = 0
            
            if strong_row_indices:
                for idx in strong_row_indices:
                    max_cols = max(max_cols, len(rows[idx]))

            for i, row in enumerate(rows):
                corrected_row = [correct_currency_symbols(str(cell)) for cell in row]
                row_string = " | ".join(corrected_row)
                full_text_for_ai += row_string + "\n"

                if strong_row_indices and table_start_idx <= i <= table_end_idx:
                    current_len = len(corrected_row)
                    if current_len < max_cols:
                        corrected_row += [""] * (max_cols - current_len)
                    final_table_rows.append(corrected_row)
                else:
                    removed_lines.append(row_string)

        if not full_text_for_ai: 
            full_text_for_ai = "No text could be extracted from the document."
        
        print("Extracting structured data from combined text...")
        structured_data = extract_structured_data(full_text_for_ai)
        
        # --- 5. AUTO-VERSIONING LOGIC (CHECK FOR DUPLICATES) ---
        final_ticket_number = structured_data.get("ticket_number")
        is_duplicate_detected = False
        original_detected_number = final_ticket_number

        if final_ticket_number:
            # 1. Check if it exists exactly
            existing_ticket = db.query(models.Ticket).filter(
                func.lower(models.Ticket.ticket_number) == final_ticket_number.strip().lower()
            ).first()

            if existing_ticket:
                print(f"⚠️ Duplicate detected for {final_ticket_number}. Calculating next version...")
                is_duplicate_detected = True # <--- FLAG SET
                
                # 2. Identify Base Name (e.g. "1005" from "1005.1")
                base_match = re.match(r"^(.*?)(?:\.(\d+))?$", final_ticket_number)
                base_name = base_match.group(1) if base_match else final_ticket_number
                
                # 3. Find all similar tickets (Base or Base.X)
                pattern = f"{base_name}%"
                similar_tickets = db.query(models.Ticket.ticket_number).filter(
                    models.Ticket.ticket_number.ilike(pattern)
                ).all()
                
                # 4. Calculate Max Version
                max_version = 0
                
                # Check if base exists strictly
                base_exists = any(t[0].lower() == base_name.lower() for t in similar_tickets if t[0])
                if base_exists:
                    max_version = max(max_version, 0)

                for (t_num,) in similar_tickets:
                    if not t_num: continue
                    # Regex to find .X suffix
                    match = re.match(re.escape(base_name) + r"\.(\d+)$", t_num, re.IGNORECASE)
                    if match:
                        version_num = int(match.group(1))
                        if version_num > max_version:
                            max_version = version_num
                
                # 5. Assign New Version
                final_ticket_number = f"{base_name}.{max_version + 1}"
                print(f"✅ Auto-assigned new version: {final_ticket_number}")

        # --- 6. SAVE TO DATABASE ---
        print("Saving new ticket to database...")
        new_ticket = models.Ticket(
            foreman_id=foreman.id, 
            timesheet_id=timesheet.id,
            job_phase_id=timesheet.job_phase_id, 
            image_path=pdf_url_path,
            
            # ✅ SAVE CATEGORIES
            category=category,
            sub_category=sub_category,

            # Save separated data
            table_data=final_table_rows,
            raw_text_content="\n".join(removed_lines),
            ticket_number=final_ticket_number,
            ticket_date=structured_data.get("ticket_date"),
            haul_vendor=structured_data.get("haul_vendor"),
            truck_number=structured_data.get("truck_number"),
            material=structured_data.get("material"),
            job_number=structured_data.get("job_number"),
            phase_code_=structured_data.get("phase_code_"),
            zone=structured_data.get("zone"),
            hours=structured_data.get("hours")
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        
        print(f"✅✅ BACKGROUND TASK: Successfully CREATED ticket {new_ticket.id}.")

        # --- 7. WEBSOCKET NOTIFICATION ---
        if is_duplicate_detected:
            # Send specific alert payload
            message_data = {
                "type": "DUPLICATE_ALERT", # Frontend listens for this
                "ticket_id": new_ticket.id,
                "original_number": original_detected_number,
                "new_number": final_ticket_number,
                "message": f"Duplicate ticket detected. Saved as {final_ticket_number}."
            }
        else:
            # Send standard success
            message_data = {
                "type": "TICKET_PROCESSED",
                "message": f"New ticket ({new_ticket.ticket_number or new_ticket.id}) is processed and ready for review.",
                "ticket_id": new_ticket.id
            }
            
        asyncio.run(manager.send_personal_message(foreman_id, message_data))

    except Exception as e:
        if db.is_active: db.rollback()
        print("--- UNEXPECTED BACKGROUND ERROR TRACEBACK ---")
        traceback.print_exc()
        print("-----------------------------------")
        print(f"An unexpected error occurred in background task: {str(e)}")
    finally:
        db.close()
        if os.path.exists(debug_scan_dir):
            try: shutil.rmtree(debug_scan_dir) 
            except OSError as e: print(f"Error removing debug directory {debug_scan_dir}: {e.strerror}")


@router.post("/scan")
async def scan_ticket(
    background_tasks: BackgroundTasks, 
    foreman_id: int = Form(...),
    files: List[UploadFile] = File(...),
    timesheet_id: int | None = Form(None),
    category: str = Form(...), 
    sub_category: str = Form(None),
    db: Session = Depends(get_db),
):
    # ... (function is unchanged) ...
    foreman = db.query(models.User).filter(models.User.id == foreman_id).first()
    if not foreman: raise HTTPException(status_code=404, detail="Foreman not found")
    timesheet = None
    if timesheet_id:
        timesheet = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if not timesheet:
        today_str = datetime.utcnow().date()
        ts_list = (
            db.query(models.Timesheet)
            .filter(models.Timesheet.foreman_id == foreman_id)
            .order_by(models.Timesheet.date.desc())
            .all()
        )
        if ts_list:
            for ts in ts_list:
                if ts.date == today_str: timesheet = ts; break
            if not timesheet:
                for ts in ts_list:
                    if ts.date <= today_str: timesheet = ts; break
            timesheet = timesheet or ts_list[0]
    if not timesheet:
        raise HTTPException(status_code=404, detail="No timesheet available for this foreman")
    file_contents_list = []
    for file_item in files:
        if file_item.content_type and file_item.content_type.startswith("image/"):
            content = await file_item.read()
            file_contents_list.append((file_item.filename, content))
    if not file_contents_list:
        raise HTTPException(status_code=400, detail="No valid images were provided.")
    print(f"Scheduling background OCR task for foreman {foreman.id}...")
    background_tasks.add_task(
        process_scan_in_background, 
        file_contents_list, 
        foreman.id, 
        timesheet.id,
        category,       # 👈 Pass to background
        sub_category
    )
    return {
        "message": "Upload successful. Ticket is being processed.",
        "detail": "The ticket will appear in your list shortly.",
        "timesheet_id": timesheet.id,
    }

# ------------------------------------------------------------------- #
# --- *** OTHER ENDPOINTS (UPDATED) *** ---
# ------------------------------------------------------------------- #

@router.get("/by-foreman/{foreman_id}")
def get_tickets_by_foreman(foreman_id: int, db: Session = Depends(database.get_db)):
    # ... (function is unchanged) ...
    tickets = db.query(models.Ticket).filter(models.Ticket.foreman_id == foreman_id).all()
    return tickets

@router.get("/images-by-date/{foreman_id}")
def list_images_by_date(foreman_id: int, db: Session = Depends(database.get_db)):
    
    all_tickets = (
        db.query(models.Ticket)
        .filter(models.Ticket.foreman_id == foreman_id) 
        .order_by(models.Ticket.created_at.desc())
        .all()
    )

    grouped_tickets = defaultdict(list)
    for t in all_tickets:
        date_str = t.created_at.strftime("%Y-%m-%d")    
        
        grouped_tickets[date_str].append({
            "id": t.id,
            "image_url": t.image_path,
            
            # --- ⭐ 2. THIS IS THE FIX ⭐ ---
            # Translate the database ENUM (PENDING) into the
            # boolean (submitted: false) that the frontend expects.
            "submitted": t.status != SubmissionStatus.PENDING,
            "category": t.category,
            "sub_category": t.sub_category,
            # ✅ Return extracted table array and raw text string
            "table_data": t.table_data,
            "raw_text_content": t.raw_text_content,
            "ticket_number": t.ticket_number,
            "ticket_date": t.ticket_date, 
            "haul_vendor": t.haul_vendor,
            "truck_number": t.truck_number,
            "material": t.material,
            "job_number": t.job_number,
            
            # --- ⭐ 3. MATCH YOUR NEW MODEL COLUMN NAME ---
            "phase_code_": t.phase_code_, # Use the underscore
            
            "zone": t.zone,
            "hours": t.hours
        })

    images_by_date = []
    for date, imgs in grouped_tickets.items():
        timesheet = (
            db.query(models.Timesheet)
            .filter(
                models.Timesheet.foreman_id == foreman_id,
                models.Timesheet.date == date
            )
            .first()
        )
        images_by_date.append({
            "date": date,
            "images": imgs,
            "status": timesheet.status if timesheet else None,
            "submission_id": timesheet.id if timesheet else None,
            "ticket_count": len(imgs),
        })
    
    images_by_date.sort(key=lambda item: item["date"], reverse=True)
    return {"imagesByDate": images_by_date}

class TicketUpdatePayload(BaseModel):
    ticket_id: int
    foreman_id: int
    ticket_number: Optional[str] = None
    ticket_date: Optional[str] = None
    haul_vendor: Optional[str] = None
    truck_number: Optional[str] = None
    material: Optional[str] = None
    job_number: Optional[str] = None
    phase_code_: Optional[str] = None
    zone: Optional[str] = None
    hours: Optional[float] = None
    
    # ✅ NEW: Accept Table Data as List of Lists
    table_data: Optional[List[List[str]]] = None
    
    # ✅ RAW TEXT: The "Extra Text" field
    raw_text: Optional[str] = None

@router.post("/update-ticket-text", status_code=status.HTTP_200_OK)
def update_ticket_text(
    payload: TicketUpdatePayload,
    db: Session = Depends(database.get_db)
):
    print(f"🔄 Update ticket request received for ticket: {payload.ticket_id}")
    
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == payload.ticket_id,
        models.Ticket.foreman_id == payload.foreman_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # 1. Update Structured Header Data
    ticket.ticket_number = payload.ticket_number
    ticket.ticket_date = payload.ticket_date
    ticket.haul_vendor = payload.haul_vendor
    ticket.truck_number = payload.truck_number
    ticket.material = payload.material
    ticket.job_number = payload.job_number
    ticket.phase_code_ = payload.phase_code_
    ticket.zone = payload.zone
    ticket.hours = payload.hours

    # 2. ✅ Update Table Data
    if payload.table_data is not None:
        ticket.table_data = payload.table_data

    # 3. ✅ Update Raw/Extra Text
    if payload.raw_text is not None:
        ticket.raw_text_content = payload.raw_text

    db.commit()
    db.refresh(ticket)

    response_data = {
        "message": "Ticket updated successfully",
        "ticket": {
            "id": ticket.id, 
            "image_url": ticket.image_path,
            "table_data": ticket.table_data,
            "raw_text_content": ticket.raw_text_content,
            # ... return other fields if needed by frontend
        }
    }
    print(f"✅ Update successful for ticket {payload.ticket_id}")
    return response_data

# ------------------------------------------------------------------- #
# --- ⭐ NEW: DELETE TICKET ENDPOINT ⭐ ---
# ------------------------------------------------------------------- #

class TicketDeletePayload(BaseModel):
    ticket_id: int
    foreman_id: int

@router.post("/delete-ticket", status_code=status.HTTP_200_OK)
def delete_ticket(
    payload: TicketDeletePayload,
    db: Session = Depends(database.get_db)
):
    print(f"🗑️ Delete ticket request received for ticket: {payload.ticket_id}")
    
    # Find the ticket, ensuring it belongs to the foreman
    ticket = db.query(models.Ticket).filter(
        models.Ticket.id == payload.ticket_id,
        models.Ticket.foreman_id == payload.foreman_id
    ).first()
    
    if not ticket:
        print(f"❌ Ticket {payload.ticket_id} not found for user {payload.foreman_id}")
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # --- 1. Delete the physical PDF file ---
    pdf_to_delete = None
    if ticket.image_path:
        try:
            # Get filename from path (e.g., "/media/tickets/file.pdf" -> "file.pdf")
            pdf_filename = os.path.basename(ticket.image_path)
            pdf_path_local = os.path.join(PDF_TICKETS_DIR, pdf_filename)
            
            if os.path.exists(pdf_path_local):
                os.remove(pdf_path_local)
                print(f"✅ Deleted physical file: {pdf_path_local}")
                pdf_to_delete = pdf_path_local
            else:
                print(f"⚠️ PDF file not found, but proceeding with DB delete: {pdf_path_local}")
        except Exception as e:
            print(f"❌ Error deleting physical file {ticket.image_path}: {e}")
            # Don't block DB delete, just log the error
            
    # --- 2. Delete the ticket from the database ---
    try:
        db.delete(ticket)
        db.commit()
        print(f"✅ Deleted ticket {payload.ticket_id} from database.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting ticket from database: {e}")
        raise HTTPException(status_code=500, detail="Database error while deleting ticket")

    return {
        "message": "Ticket deleted successfully",
        "deleted_ticket_id": payload.ticket_id,
        "deleted_file_path": pdf_to_delete
    }


class TicketCheckPayload(BaseModel):
    ticket_number: str
    exclude_ticket_id: Optional[int] = None

# --- 2. NEW ENDPOINT: CHECK AVAILABILITY & CALCULATE VERSION ---
@router.post("/check-ticket-availability")
def check_ticket_availability(
    payload: TicketCheckPayload, 
    db: Session = Depends(get_db)
):
    ticket_num = payload.ticket_number.strip()
    
    # Check if this EXACT ticket number exists (excluding the current ticket being edited)
    query = db.query(models.Ticket).filter(
        func.lower(models.Ticket.ticket_number) == ticket_num.lower()
    )
    
    if payload.exclude_ticket_id:
        query = query.filter(models.Ticket.id != payload.exclude_ticket_id)
    
    exists = query.first() is not None

    if not exists:
        return {"exists": False, "next_version": None}

    # --- VERSIONING LOGIC ---
    # 1. Identify the "Base" number. 
    # If ticket is "100.1", base is "100". If "100", base is "100".
    base_match = re.match(r"^(.*?)(?:\.(\d+))?$", ticket_num)
    if base_match:
        base_name = base_match.group(1)
    else:
        base_name = ticket_num

    # 2. Find all tickets that look like "Base" or "Base.%"
    # We use ILIKE for case-insensitive matching in Postgres/SQLite
    pattern = f"{base_name}%" 
    similar_tickets = db.query(models.Ticket.ticket_number).filter(
        models.Ticket.ticket_number.ilike(pattern)
    ).all()

    # 3. Calculate Max Version
    max_version = 0
    
    # Check the base itself exists
    base_exists = any(t[0].lower() == base_name.lower() for t in similar_tickets if t[0])
    if base_exists:
        max_version = max(max_version, 0)

    for (t_num,) in similar_tickets:
        if not t_num: continue
        # Regex to find .X suffix
        match = re.match(re.escape(base_name) + r"\.(\d+)$", t_num, re.IGNORECASE)
        if match:
            version_num = int(match.group(1))
            if version_num > max_version:
                max_version = version_num
    
    next_version_str = f"{base_name}.{max_version + 1}"

    return {
        "exists": True, 
        "next_version": next_version_str,
        "message": f"Ticket {ticket_num} already exists."
    }

# For website

# ... imports ...

@router.get("/all-images-grouped")
def get_all_images_grouped(db: Session = Depends(get_db)):
    """
    Fetches ALL tickets for the Admin Dashboard (Read-Only).
    """
    try:
        # 1. Query Tickets + Join Foreman Name
        all_tickets = db.query(Ticket).options(joinedload(Ticket.foreman)).order_by(Ticket.created_at.desc()).all()

        grouped_data = []

        # 2. Group by Date
        for date_key, group in groupby(all_tickets, key=lambda x: x.created_at.strftime("%Y-%m-%d")):
            tickets_list = list(group)
            
            mapped_images = []
            for t in tickets_list:
                # Get Name safely
                f_name = "Unknown"
                if t.foreman:
                    f_name = f"{t.foreman.first_name} {t.foreman.last_name}"

                mapped_images.append({
                    "id": t.id,
                    "foreman_id": t.foreman_id,
                    "foreman_name": f_name,
                    "image_url": t.image_path,
                    "submitted": t.status != SubmissionStatus.PENDING,
                    
                    # ✅ NEW FIELDS MAPPED FROM MODEL
                    "category": t.category,
                    "sub_category": t.sub_category,
                    "table_data": t.table_data if t.table_data else [], # Ensure list if null

                    # OCR Data
                    "ticket_number": t.ticket_number,
                    "ticket_date": t.ticket_date,
                    "haul_vendor": t.haul_vendor,
                    "truck_number": t.truck_number,
                    "material": t.material,
                    "job_number": t.job_number,
                    "phase_code_": t.phase_code_,
                    "zone": t.zone,
                    "hours": t.hours,
                    "raw_text_content": t.raw_text_content
                })

            group_obj = {
                "date": date_key,
                "images": mapped_images,
                "ticket_count": len(mapped_images),
            }
            grouped_data.append(group_obj)

        return grouped_data

    except Exception as e:
        print(f"Error fetching grouped tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/")
async def root():
    return {"message": "OCR API is running successfully!"}