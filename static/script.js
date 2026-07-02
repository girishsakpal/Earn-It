document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    // ---------- Sample fallback stats ----------
    const sampleStats = {
        professions: ["Software Engineer", "Data Scientist", "Doctor", "Teacher", "Accountant", "Lawyer"],
        avg_salary_lpa: [18, 20, 12, 4, 6, 9],
        salary_vs_exp: {
            "Software Engineer": [3, 4, 5, 6, 8, 10, 11, 12, 13, 14, 15, 16],
            "Data Scientist": [3, 4, 5.5, 7, 9, 11, 12, 13, 14, 15, 16, 17],
            "Doctor": [4, 5, 6, 7, 8, 9, 10, 10.5, 11, 11.5, 12, 12.2],
            "Teacher": [2, 2.2, 2.4, 2.6, 2.8, 3, 3.3, 3.6, 3.8, 4, 4.1, 4.2],
            "Accountant": [2.5, 2.7, 3, 3.3, 3.8, 4.5, 5, 5.5, 5.8, 6, 6.2, 6.4],
            "Lawyer": [3, 3.5, 4, 4.5, 5.5, 6.5, 7, 7.5, 8, 8.5, 8.8, 9]
        }
    };

    // ---------- Theme toggle ----------
    const themeToggle = $('themeToggle');
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('earnit_theme', theme);
    }
    themeToggle.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        setTheme(cur === 'light' ? 'dark' : 'light');
    });
    (function initTheme() {
        setTheme(localStorage.getItem('earnit_theme') || 'light');
    })();

    // ---------- Form dynamic fields ----------
    const jobSelect = $('JobTitle');
    const techFields = $('techFields');

    function toggleTechFields() {
        const job = jobSelect.value;
        if (job === "Software Engineer" || job === "Data Scientist") {
            techFields.style.display = 'flex';
        } else {
            techFields.style.display = 'none';
            $('SkillCount').value = 0;
            $('Certification').value = 0;
        }
    }

    jobSelect.addEventListener('change', toggleTechFields);

    // ---------- Fetch stats ----------
    async function fetchStats() {
        try {
            const res = await fetch('/stats');
            if (!res.ok) throw new Error('no stats endpoint');
            return await res.json();
        } catch {
            return sampleStats;
        }
    }

    // ---------- Charts ----------
    let avgByProfChart, salaryExpChart, compareChart;

    function createAvgByProfChart(ctx, labels, values) {
        if (avgByProfChart) avgByProfChart.destroy();
        avgByProfChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Average LPA', data: values, borderRadius: 6, barThickness: 28 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function createSalaryExpChart(ctx, prof, salaryArray) {
        if (salaryExpChart) salaryExpChart.destroy();
        const labels = salaryArray.map((_, i) => i + "y");
        salaryExpChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: prof + ' - Salary vs Experience (LPA)', data: salaryArray, fill: false, tension: 0.2, pointRadius: 2 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    function createCompareChart(ctx, avg, predicted) {
        if (compareChart) compareChart.destroy();
        compareChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Average', 'You (pred)'], datasets: [{ data: [avg, predicted], hoverOffset: 6 }] },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // ---------- Initialize visuals ----------
    (async function initVisuals() {
        const stats = await fetchStats();
        createAvgByProfChart($('avgByProfChart'), stats.professions, stats.avg_salary_lpa);
        const firstProf = stats.professions[0];
        const salaryArr = stats.salary_vs_exp[firstProf] || sampleStats.salary_vs_exp[firstProf];
        createSalaryExpChart($('salaryExpChart'), firstProf, salaryArr);
        createCompareChart($('compareChart'), 1, 1);

        // Load model images dynamically
        const images = [
            "Gradient Boosting_pred_vs_actual.png", "Gradient Boosting_residuals.png", "Gradient_Boosting_confusion_matrix.png",
            "HistGradientBoosting_pred_vs_actual.png", "HistGradientBoosting_residuals.png", "HistGradientBoosting_confusion_matrix.png",
            "KNN_pred_vs_actual.png", "KNN_residuals.png", "KNN_confusion_matrix.png",
            "Linear Regression_pred_vs_actual.png", "Linear Regression_residuals.png", "Linear_Regression_confusion_matrix.png",
            "Random Forest_pred_vs_actual.png", "Random Forest_residuals.png", "Random_Forest_confusion_matrix.png",
            "Support Vector Regressor_pred_vs_actual.png", "Support Vector Regressor_residuals.png", "Support_Vector_Regressor_confusion_matrix.png"
        ];
        const modelImagesContainer = $('modelImages');
        images.forEach(img => {
            const div = document.createElement('div');
            div.className = "card chart-card";
            const caption = img === "model_comparison.png" ? "Model Comparison: R² Score"
                : img.includes("pred_vs_actual") ? img.replace("_pred_vs_actual.png", "") + " - Predicted vs Actual"
                    : img.replace("_residuals.png", "") + " - Residuals Distribution";
            div.innerHTML = `<img src="../static/${img}" style="width:100%; display:block; margin-bottom:6px;" alt="${caption}"><div style="text-align:center; font-size:0.9rem; color: var(--muted);">${caption}</div>`;
            modelImagesContainer.appendChild(div);
        });
    })();

    // ---------- Recommendations ----------
    function getRecommendation(job, experience, gap, skillsCount, certCount) {
        let recs = [];
        if (gap <= -3) recs.push("🚀 Far above average! Consider leadership roles.");
        else if (gap < 0) recs.push("✅ Above average. Keep improving skills.");
        else if (gap <= 2) recs.push("⚡ Close to average. Focus on key skills.");
        else recs.push("🔧 Below average. Upskilling recommended.");

        if (experience < 5 && gap > 1) recs.push("Gain 2–3 more years of experience.");
        else if (experience >= 5 && gap > 1) recs.push("Consider certifications or leadership roles.");

        if (skillsCount > 0) recs.push(`Skills entered: ${skillsCount}`);
        if (certCount > 0) recs.push(`Certifications: ${certCount}`);

        switch (job) {
            case "Software Engineer":
                recs.push("Learn Cloud, DevOps, System Design, advanced frameworks.");
                break;
            case "Data Scientist":
                recs.push("Upskill in ML, Deep Learning, MLOps, Data Engineering.");
                break;
            case "Doctor":
                recs.push("Consider specialization, research, or advanced certifications.");
                break;
            case "Teacher":
                recs.push("Explore EdTech tools, innovative teaching, higher qualifications.");
                break;
            case "Accountant":
                recs.push("Get certifications like CA, CFA, or finance software expertise.");
                break;
            case "Lawyer":
                recs.push("Specialize in corporate law, litigation, or pursue LLM.");
                break;
        }
        return recs.join(" • ");
    }

    // ---------- Form submit ----------
    document.getElementById('predictForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const $ = (id) => document.getElementById(id);

        // Read form values
        const age = parseInt($('Age').value);
        const gender = $('Gender').value;
        const education = $('EducationLevel').value;
        const job = $('JobTitle').value;
        const experience = parseInt($('Experience').value);
        const company = $('CompanyTier').value;
        const city = $('City').value;
        const skills = (job === 'Software Engineer' || job === 'Data Scientist') ? parseInt($('SkillCount').value) || 0 : 0;
        const certifications = (job === 'Software Engineer' || job === 'Data Scientist') ? parseInt($('Certification').value) || 0 : 0;

        // Prepare payload
        const payload = {
            "Age": age,
            "Gender": gender,
            "Education Level": education,
            "Job Title": job,
            "Years of Experience": experience,
            "Company Tier": company,
            "City": city,
            "Skill Count": skills,
            "Certification": certifications
        };

        try {
            const res = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                $('result').innerHTML = `⚠️ Server error: ${res.status} ${await res.text()}`;
                return;
            }

            const result = await res.json();

            if (result.lower_lpa == null || result.upper_lpa == null) {
                $('result').innerHTML = `⚠️ Unexpected response from server.`;
                return;
            }

            // Show predicted salary range
            $('result').innerHTML = `💰 Estimated Salary Range: <strong>${result.lower_lpa} LPA – ${result.upper_lpa} LPA</strong>`;

            // Fetch stats for comparison
            const stats = await fetchStats();
            const idx = stats.professions.indexOf(job);
            const profAvg = idx >= 0 ? stats.avg_salary_lpa[idx] : 0;

            // Compute predicted mid
            const predictedMid = (Number(result.lower_lpa) + Number(result.upper_lpa)) / 2;

            // Difference & percent
            const diff = (predictedMid - profAvg).toFixed(2);
            const pct = profAvg ? ((predictedMid - profAvg) / profAvg * 100).toFixed(1) : '0';

            // Update comparison info
            $('compareInfo').innerHTML = `
            <strong>${job} average:</strong> ${profAvg} LPA <br/>
            <strong>Your predicted:</strong> ${predictedMid.toFixed(2)} LPA <br/>
            ${diff >= 0 ? `▲ +${diff} LPA (${pct}%) above average` : `▼ ${Math.abs(diff)} LPA (${Math.abs(pct)}%) below average`}
           `;

            // Update doughnut chart
            createCompareChart($('compareChart'), profAvg, predictedMid);

            // Update salary vs experience chart for selected job
            const salaryArr = stats.salary_vs_exp[job] || [];
            if (salaryArr.length) createSalaryExpChart($('salaryExpChart'), job, salaryArr);

            // ---------- 🧠 NEW: Generate and display recommendations ----------
            const recText = getRecommendation(job, experience, diff, skills, certifications);
            $('recommendationBox').innerHTML = `<div class="recommendation-text">${recText}</div>`;

        } catch (err) {
            console.error(err);
            $('result').innerHTML = "⚠️ Server unreachable. Try again later.";
        }
    });


});
