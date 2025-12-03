Manha POS System

A modern, React-based Point of Sale (POS) system for small businesses. Features inventory management, real-time sales tracking, and receipt generation.

Features

📦 Inventory Management: Add, edit, and track items.

💰 Point of Sale: Fast and responsive checkout interface with BDT currency support.

📊 Sales History: Track orders, revenue, and print past receipts.

🖨️ Receipt Generation: Printable invoices with QR codes for order verification.

🔒 Security Mode: Lock the app with a PIN to prevent unauthorized access.

☁️ Firebase Integration: Real-time cloud database.

Prerequisites

Node.js (v16 or higher)

A Firebase Project (Free tier is fine)

Installation

Clone the repository:

git clone [https://github.com/YOUR_USERNAME/manha-pos.git](https://github.com/YOUR_USERNAME/manha-pos.git)
cd manha-pos


Install dependencies:

npm install


Configure Firebase:

Go to src/App.jsx.

Look for the firebaseConfig object near the top.

Replace the placeholder values with your actual Firebase configuration keys.

Run the development server:

npm run dev


Building for Production

To create a production build (for hosting on Vercel/Netlify):

npm run build


Technologies Used

React.js

Tailwind CSS

Firebase (Firestore & Auth)

Lucide React (Icons)

Vite
