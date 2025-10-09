from flask import Flask, request, jsonify, render_template, url_for
from flask_cors import CORS
import joblib
import pandas as pd
import os
import json

# =============================
# Flask app setup
# =============================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))  # root of project

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'template'),
    static_folder=os.path.join(BASE_DIR, 'static')
)
CORS(app)

# =============================
# Load trained model
# =============================
MODEL_PATH = os.path.join(os.getcwd(), 'models', 'salary_predictor.pkl')
model = joblib.load(MODEL_PATH)

# Features used during training
feature_cols = ['Age', 'Gender', 'Education Level', 'Job Title', 
                'Years of Experience', 'Company Tier']

# Dropdown options for HTML form
GENDERS = ["Male", "Female"]
EDUCATION_LEVELS = ["High School", "Bachelors", "Masters", "PhD"]
JOB_TITLES = ["Software Engineer", "Data Scientist", "Doctor", "Teacher", "Accountant", "Lawyer"]
COMPANY_TIERS = ["MNC", "Mid-size", "Startup"]

# =============================
# HTML Form Route
# =============================
@app.route("/", methods=["GET"])
def index():
    """Render the main HTML form."""
    return render_template(
        "index.html",
        genders=GENDERS,
        education_levels=EDUCATION_LEVELS,
        job_titles=JOB_TITLES,
        company_tiers=COMPANY_TIERS
    )

@app.route("/predict", methods=["POST"])
def predict():
    """Handle prediction for both HTML form and JSON requests."""
    # JSON request (API call)
    if request.is_json:
        try:
            data = request.get_json()

            # Ensure consistent feature order
            X = pd.DataFrame([{c: data.get(c, 0) for c in feature_cols}])
            pred = model.predict(X)[0]

            # Tech roles adjustment
            if data.get("Job Title") in ["Software Engineer", "Data Scientist"]:
                skill_factor = 1 + 0.03 * int(data.get("Skill Count", 0))
                cert_factor = 1 + 0.02 * int(data.get("Certification", 0))
                pred *= skill_factor * cert_factor

            # Salary range ±10% and convert to LPA
            lower = round(pred * 0.9 / 100000, 2)
            upper = round(pred * 1.1 / 100000, 2)

            return jsonify({"lower_lpa": lower, "upper_lpa": upper})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # HTML form submission
    else:
        try:
            age = int(request.form["age"])
            gender = request.form["gender"]
            education = request.form["education"]
            job = request.form["job"]
            experience = int(request.form["experience"])
            company = request.form["company"]
            city = request.form.get("city", "")
            skills = int(request.form.get("SkillCount") or 0)
            certifications = int(request.form.get("Certification") or 0)

            input_df = pd.DataFrame([{
                "Age": age,
                "Gender": gender,
                "Education Level": education,
                "Job Title": job,
                "Years of Experience": experience,
                "Company Tier": company
            }])

            salary_pred = model.predict(input_df)[0]

            # Tech roles adjustment
            if job in ["Software Engineer", "Data Scientist"]:
                salary_pred *= (1 + 0.03 * skills) * (1 + 0.02 * certifications)

            lower = round(salary_pred * 0.9 / 100000, 2)
            upper = round(salary_pred * 1.1 / 100000, 2)

            prediction_range = f"{lower} LPA – {upper} LPA"

            return render_template(
                "index.html",
                prediction=prediction_range,
                genders=GENDERS,
                education_levels=EDUCATION_LEVELS,
                job_titles=JOB_TITLES,
                company_tiers=COMPANY_TIERS
            )

        except Exception as e:
            return render_template(
                "index.html",
                error=str(e),
                genders=GENDERS,
                education_levels=EDUCATION_LEVELS,
                job_titles=JOB_TITLES,
                company_tiers=COMPANY_TIERS
            )


# =============================
# API: Model Scores
# =============================
@app.route("/model-scores", methods=["GET"])
def model_scores():
    try:
        scores_path = os.path.join("../static", "model_scores.json")
        if os.path.exists(scores_path):
            with open(scores_path, "r") as f:
                scores = json.load(f)
            return jsonify(scores)
        else:
            return jsonify({"error": "Model scores not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =============================
# API: Model Visualizations
# =============================
@app.route("/model-visuals", methods=["GET"])
def model_visuals():
    try:
        static_dir = os.path.join("../static")
        visuals = [f for f in os.listdir(static_dir) if f.endswith(".png")]
        visuals = [url_for('static', filename=v) for v in visuals]
        return jsonify({"visuals": visuals})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =============================
# Run app
# =============================
if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0')
