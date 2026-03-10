
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, UploadFile, File
import pandas as pd
import os

from database import engine, SessionLocal
from models import Base, PollutionData

# ---------------- APP INIT ----------------
app = FastAPI()

# ---------------- CREATE TABLES ----------------
Base.metadata.create_all(bind=engine)

# ---------------- BASIC ROUTES ----------------
@app.get("/api")
def home():
    return {"message": "Backend is working"}

@app.get("/status")
def status():
    return {"status": "Server is running properly"}

# ---------------- UPLOAD + SAVE DATA ----------------
@app.post("/upload_file")
async def upload_file(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)

    df = df.dropna()

    metal_cols = ["Pb", "Cd", "Hg", "As", "Cr"]
    for col in metal_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna()

    db = SessionLocal()

    for _, row in df.iterrows():
        record = PollutionData(
            region=row["region"],
            sample_type=row["sample_type"],
            date=row["date"],
            Pb=row["Pb"],
            Cd=row["Cd"],
            Hg=row["Hg"],
            As=row["As"],
            Cr=row["Cr"]
        )
        db.add(record)

    db.commit()
    db.close()

    return {
        "message": "Data saved to database",
        "rows_saved": len(df)
    }

# ---------------- INITIALIZE DIVERSE DATA (10 REGIONS) ----------------
@app.get("/init-data")
def init_data():
    db = SessionLocal()
    # Check if we already have data to avoid duplicates if desired, 
    # but here we'll just clear and repopulate for a clean 10-region demo.
    db.query(PollutionData).delete()
    
    data = [
        {"region": "RegionA", "city": "Bengaluru", "area": "Whitefield", "Pb": 10.5, "Cd": 0.3, "Hg": 0.01, "As": 5.2, "Cr": 20.1, "type": "Soil"},
        {"region": "RegionB", "city": "Mumbai", "area": "Andheri", "Pb": 7.2, "Cd": 1.5, "Hg": 0.05, "As": 3.1, "Cr": 45.3, "type": "Soil"},
        {"region": "RegionC", "city": "Delhi", "area": "Rohini", "Pb": 25.4, "Cd": 4.1, "Hg": 0.8, "As": 12.5, "Cr": 55.7, "type": "Industrial Soil"},
        {"region": "RegionD", "city": "Chennai", "area": "Adyar", "Pb": 5.1, "Cd": 0.2, "Hg": 0.01, "As": 2.2, "Cr": 15.4, "type": "Coastal Soil"},
        {"region": "RegionE", "city": "Kolkata", "area": "Salt Lake", "Pb": 12.3, "Cd": 2.1, "Hg": 0.1, "As": 15.2, "Cr": 35.8, "type": "Wetland Soil"},
        {"region": "RegionF", "city": "Hyderabad", "area": "Gachibowli", "Pb": 8.4, "Cd": 0.5, "Hg": 0.02, "As": 4.1, "Cr": 22.1, "type": "Soil"},
        {"region": "RegionG", "city": "Pune", "area": "Hinjewadi", "Pb": 6.7, "Cd": 0.4, "Hg": 0.01, "As": 3.5, "Cr": 18.9, "type": "Soil"},
        {"region": "RegionH", "city": "Ahmedabad", "area": "Satellite", "Pb": 15.2, "Cd": 3.2, "Hg": 0.5, "As": 8.9, "Cr": 42.1, "type": "Arid Soil"},
        {"region": "RegionI", "city": "Jaipur", "area": "Malviya Nagar", "Pb": 4.2, "Cd": 0.1, "Hg": 0.01, "As": 1.1, "Cr": 10.5, "type": "Sandy Soil"},
        {"region": "RegionJ", "city": "Lucknow", "area": "Gomti Nagar", "Pb": 18.1, "Cd": 2.5, "Hg": 0.3, "As": 9.2, "Cr": 38.4, "type": "Alluvial Soil"}
    ]
    
    for d in data:
        # Store just the region ID (e.g., 'RegionA')
        # The frontend will append the city/area names automatically
        region_id = d['region']
        record = PollutionData(
            region=region_id,
            sample_type=d["type"],
            date="2026-02-13",
            Pb=d["Pb"],
            Cd=d["Cd"],
            Hg=d["Hg"],
            As=d["As"],
            Cr=d["Cr"]
        )
        db.add(record)
    
    db.commit()
    db.close()
    return {"message": "Database initialized with 10 diverse regions"}

# ---------------- VIEW DATA ----------------
@app.get("/data")
def get_data():
    try:
        db = SessionLocal()
        records = db.query(PollutionData).all()
        db.close()

        if not records:
            print("Warning: No records found in pollution_data table.")

        return [
            {
                "region": r.region,
                "sample_type": r.sample_type,
                "date": r.date,
                "Pb": r.Pb,
                "Cd": r.Cd,
                "Hg": r.Hg,
                "As": r.As,
                "Cr": r.Cr
            }
            for r in records
        ]
    except Exception as e:
        print(f"Error fetching data: {e}")
        return {"error": str(e)}, 500

# ---------------- HMRI CALCULATION ----------------
@app.get("/hmri")
def calculate_hmri():
    db = SessionLocal()
    records = db.query(PollutionData).all()
    db.close()

    limits = {
        "Pb": 10,
        "Cd": 3,
        "Hg": 1,
        "As": 10,
        "Cr": 50
    }

    weights = {
        "Pb": 0.3,
        "Cd": 0.25,
        "Hg": 0.2,
        "As": 0.15,
        "Cr": 0.1
    }

    results = []

    for r in records:
        score = (
            (r.Pb / limits["Pb"]) * weights["Pb"] +
            (r.Cd / limits["Cd"]) * weights["Cd"] +
            (r.Hg / limits["Hg"]) * weights["Hg"] +
            (r.As / limits["As"]) * weights["As"] +
            (r.Cr / limits["Cr"]) * weights["Cr"]
        )

        if score < 0.5:
            level = "Safe"
        elif score < 1.0:
            level = "Moderate"
        elif score < 1.5:
            level = "High"
        else:
            level = "Severe"

        results.append({
            "region": r.region,
            "hmri_score": round(score, 2),
            "risk_level": level
        })

    return results

# ---------------- AI INSIGHTS ----------------
@app.get("/insights")
def generate_insights():

    db = SessionLocal()
    records = db.query(PollutionData).all()
    db.close()

    limits = {
        "Pb": 10,
        "Cd": 3,
        "Hg": 1,
        "As": 10,
        "Cr": 50
    }

    weights = {
        "Pb": 0.3,
        "Cd": 0.25,
        "Hg": 0.2,
        "As": 0.15,
        "Cr": 0.1
    }

    insights = []

    for r in records:

        score = (
            (r.Pb / limits["Pb"]) * weights["Pb"] +
            (r.Cd / limits["Cd"]) * weights["Cd"] +
            (r.Hg / limits["Hg"]) * weights["Hg"] +
            (r.As / limits["As"]) * weights["As"] +
            (r.Cr / limits["Cr"]) * weights["Cr"]
        )

        score = round(score, 2)

        if score < 0.5:
            risk_level = "Safe"
            risk_message = "Pollution levels are within safe limits."
        elif score < 1.0:
            risk_level = "Moderate"
            risk_message = "Moderate contamination detected."
        elif score < 1.5:
            risk_level = "High"
            risk_message = "High pollution risk detected."
        else:
            risk_level = "Severe"
            risk_message = "Severe pollution risk detected."

        contributions = {
            "Pb": r.Pb / limits["Pb"],
            "Cd": r.Cd / limits["Cd"],
            "Hg": r.Hg / limits["Hg"],
            "As": r.As / limits["As"],
            "Cr": r.Cr / limits["Cr"]
        }

        main_metal = max(contributions, key=contributions.get)
        
        # Treatment mapping (Soil Remediation Methods)
        treatments = {
            "Pb": "Phytoremediation or Soil Washing",
            "Cd": "Soil Amendments (Biochar/Lime)",
            "Hg": "Stabilization & Solidification",
            "As": "Phytoremediation (Fern extraction)",
            "Cr": "Reduction & Chemical Precipitation"
        }
        solution = treatments.get(main_metal, "Detailed soil analysis recommended") if risk_level != "Safe" else "No immediate remediation required"

        insights.append({
            "region": r.region,
            "hmri_score": score,
            "risk_level": risk_level,
            "main_risk_metal": main_metal,
            "insight": f"{r.region} has HMRI score {score} ({risk_level}). Major contributor: {main_metal}. {risk_message}",
            "solution": solution
        })

    return insights


# ---------------- CROP SUITABILITY ADVISOR ----------------
@app.get("/crop-advisor")
def crop_advisor(crop: str):
    db = SessionLocal()
    records = db.query(PollutionData).all()
    db.close()

    # Define crop profiles: { metal: max_tolerable_value (mock) }
    # These are illustrative thresholds for heavy metal sensitivity
    crop_profiles = {
        "sunflower": {"Pb": 50, "Cd": 5, "Hg": 1.5, "As": 12, "Cr": 60, "type": "Tolerant / Phytoremediator"},
        "rice": {"Pb": 10, "Cd": 2, "Hg": 0.5, "As": 8, "Cr": 40, "type": "Moderate / Consumption Concern"},
        "spinach": {"Pb": 5, "Cd": 1, "Hg": 0.2, "As": 5, "Cr": 20, "type": "Sensitive / High Bioaccumulator"},
        "mustard": {"Pb": 40, "Cd": 10, "Hg": 1, "As": 15, "Cr": 50, "type": "Phytoremediator"},
        "tomato": {"Pb": 15, "Cd": 1.5, "Hg": 0.8, "As": 10, "Cr": 45, "type": "Food Crop / Moderate"},
        "wheat": {"Pb": 25, "Cd": 3, "Hg": 1, "As": 12, "Cr": 50, "type": "Resilient / General Purpose"},
        "rose": {"Pb": 15, "Cd": 1, "Hg": 0.5, "As": 8, "Cr": 35, "type": "Ornamental / Soil Quality Sensitive"},
        "hibiscus": {"Pb": 20, "Cd": 2, "Hg": 0.8, "As": 10, "Cr": 40, "type": "Ornamental / Tropical"},
        "pitcher plant": {"Pb": 10, "Cd": 0.5, "Hg": 0.2, "As": 5, "Cr": 15, "type": "Exotic / Carnivorous (Loves Swampy Soil)"},
        "tulsi": {"Pb": 10, "Cd": 0.5, "Hg": 0.3, "As": 5, "Cr": 25, "type": "Medicinal Herb / Sensitive"}
    }

    crop_lower = crop.lower()
    profile = None
    
    # Simple fuzzy match for common crops
    for key in crop_profiles:
        if key in crop_lower or crop_lower in key:
            profile = crop_profiles[key]
            crop_display = key.capitalize()
            break
            
    if not profile:
        # Default profile for unknown crops (safe average thresholds)
        profile = {"Pb": 20, "Cd": 2, "Hg": 0.5, "As": 10, "Cr": 40, "type": "General Crop / Standard Assessment"}
        crop_display = crop.capitalize()

    suitability_results = []
    for r in records:
        issues = []
        if r.Pb > profile["Pb"]: issues.append(f"Lead ({r.Pb} > {profile['Pb']})")
        if r.Cd > profile["Cd"]: issues.append(f"Cadmium ({r.Cd} > {profile['Cd']})")
        if r.Hg > profile["Hg"]: issues.append(f"Mercury ({r.Hg} > {profile['Hg']})")
        if r.As > profile["As"]: issues.append(f"Arsenic ({r.As} > {profile['As']})")
        if r.Cr > profile["Cr"]: issues.append(f"Chromium ({r.Cr} > {profile['Cr']})")

        status = "Suitable" if not issues else "Restricted"
        reason = "All metal levels are within tolerable limits for this crop." if not issues else f"Exceeds tolerance: {', '.join(issues)}."
        
        # Add special context for phytoremediators
        if "Phytoremediator" in profile["type"] and status == "Restricted":
            reason += " However, this crop is a known phytoremediator and can help clean this soil, though harvest should not be consumed."

        # SUGGESTIONS logic: Find other crops that ARE suitable in this restricted region
        suggestions = []
        if status == "Restricted":
            for alt_name, alt_profile in crop_profiles.items():
                if alt_name == crop_lower: continue
                
                alt_issues = []
                if r.Pb > alt_profile["Pb"]: alt_issues.append("Pb")
                if r.Cd > alt_profile["Cd"]: alt_issues.append("Cd")
                if r.Hg > alt_profile["Hg"]: alt_issues.append("Hg")
                if r.As > alt_profile["As"]: alt_issues.append("As")
                if r.Cr > alt_profile["Cr"]: alt_issues.append("Cr")
                
                if not alt_issues:
                    suggestions.append(alt_name.capitalize())

        suitability_results.append({
            "region": r.region,
            "status": status,
            "reason": reason,
            "metals": {"Pb": r.Pb, "Cd": r.Cd, "Hg": r.Hg, "As": r.As, "Cr": r.Cr},
            "suggestions": suggestions[:3] # Show top 3 suitable alternatives
        })

    return {
        "crop": crop_display,
        "type": profile["type"],
        "results": suitability_results
    }


# ---------------- AI VISUAL IDENTIFIER ----------------
@app.get("/visual-identify")
def visual_identify(filename: str):
    # Mock AI Identification logic based on filename keywords
    # In a real app, this would process the image pixels
    fn = filename.lower()
    
    if "sunflower" in fn: return {"identified": "Sunflower"}
    if "rose" in fn: return {"identified": "Rose"}
    if "hibiscus" in fn or "tropical" in fn or "flower" in fn: return {"identified": "Hibiscus"}
    if "tulsi" in fn or "basil" in fn or "holy" in fn or "medicinal" in fn or "herbal" in fn: 
        return {"identified": "Tulsi"}
    if "pitcher" in fn or "sarracenia" in fn or "nepenthes" in fn or "carnivorous" in fn: 
        return {"identified": "Pitcher Plant"}
    if "rice" in fn: return {"identified": "Rice"}
    if "spinach" in fn: return {"identified": "Spinach"}
    if "mustard" in fn: return {"identified": "Mustard"}
    if "tomato" in fn: return {"identified": "Tomato"}
    if "wheat" in fn: return {"identified": "Wheat"}
    
    # Updated fallback list to include newer plants
    import random
    options = ["Sunflower", "Rice", "Spinach", "Mustard", "Tomato", "Wheat", "Rose", "Hibiscus", "Pitcher Plant", "Tulsi"]
    return {"identified": random.choice(options)}


# ---------------- SERVE FRONTEND ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app.mount(
    "/",
    StaticFiles(directory=os.path.join(BASE_DIR, "frontend"), html=True),
    name="frontend"
)
