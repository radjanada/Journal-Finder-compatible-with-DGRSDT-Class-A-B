To run and use this application completely offline on your PC, follow these steps:
1. Export the Application Code
Click on the Settings menu (gear icon) in the top-right corner of AI Studio.
Select Export to ZIP (or export to your GitHub repository).
Extract the downloaded ZIP file into a folder on your computer.
2. Run the App Locally on Your PC
Make sure you have Node.js (https://nodejs.org/en/download/current) installed on your computer. Then, open your terminal (Command Prompt, Terminal, or VS Code integrated terminal) inside the extracted folder and run:
code
Bash
# Install dependencies
npm install

# Start the local development server
npm run dev
Once started, open your browser and go to http://localhost:3000. The application will run entirely on your local machine without needing an internet connection.
3. Managing Your Data Offline
Automatic Saving: All your changes, journal edits, notes, and custom lists are automatically saved in your browser's local storage.
Backup & Restore: Use the Export Backup (.json) button in the header dropdown menu to download your complete database and personal notes to your computer. You can restore it anytime using Restore Backup (.json).
