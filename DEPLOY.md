# 🚀 Deploying to the Web (Free & Permanent)

To make your **AI Resume Analyzer & Job Matcher** accessible from any device (phone, tablet, or laptop) at any time, you can deploy it to **Render**, a free and developer-friendly cloud hosting platform.

Follow these 4 simple steps to get your permanent public URL:

---

## Step 1: Push your code to GitHub

1. Create a free account on [GitHub](https://github.com/) if you don't have one.
2. Create a new repository:
   - Name it (e.g., `ai-resume-analyzer`).
   - Keep it **Public** or **Private**.
   - Do **NOT** initialize it with a README, `.gitignore`, or License (we already have these).
3. Open your terminal in the project directory (`c:\Users\mahes\Desktop\AI Resume Analyzer`) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <YOUR_GITHUB_REPO_URL>
   git push -u origin main
   ```

---

## Step 2: Create a Free Render Account

1. Go to [Render](https://render.com/).
2. Click **Get Started** and sign up using your **GitHub** account (this makes connecting your repository instant).

---

## Step 3: Create a Web Service on Render

1. On the Render Dashboard, click the **New +** button in the top right and select **Web Service**.
2. Under **Connect a repository**, locate your repository (e.g., `ai-resume-analyzer`) and click **Connect**.
3. Configure the following deployment settings:
   - **Name**: `ai-resume-analyzer` (or any name you prefer).
   - **Region**: Choose the region closest to you (e.g., Oregon or Singapore).
   - **Branch**: `main`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Scroll down, choose the **Free** instance type (which costs $0/month).
5. Click **Create Web Service**.

---

## Step 4: Access Your App!

Render will now pull the code from GitHub, install the python requirements, and start the FastAPI server. 

Once the logs say `Application startup complete`, your service will show a status of **Live** in green. At the top of the page, you'll see your permanent web address, looking something like this:
👉 `https://ai-resume-analyzer-xxxx.onrender.com`

You can open this link on any mobile phone, tablet, or computer globally!

---

### 💡 (Optional) Add your Gemini API Key globally
If you want the web app to work for everyone out-of-the-box without forcing them to enter their API keys in the Settings tab:
1. Go to your web service on Render, select **Environment**.
2. Click **Add Environment Variable**.
3. Set **Key** to `GEMINI_API_KEY` and **Value** to your Google AI Studio API Key.
4. Click **Save Changes**. The server will automatically redeploy with the key active!
