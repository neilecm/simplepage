# simplepage
🧠 Cera Brasileira Marketplace
Full-Stack E-Commerce Platform with Real-Time Shipping, Payment, and Admin Dashboard
Built with Supabase, Netlify Functions, and Midtrans.

(Checkout page with real-time shipping and Midtrans integration)
🌍 Overview
Cera Brasileira Marketplace is a full-stack e-commerce platform combining a clean, modular front-end with a secure, serverless back-end.
The system manages product checkout, dynamic shipping, Midtrans payments, and an authenticated Supabase-backed admin dashboard for order management.
It is fully functional in development (localhost) and deploy-ready for Netlify + Supabase production environments.
⚙️ Tech Stack
Layer	Technology	Description
Frontend	HTML5, CSS3, JavaScript (ES Modules)	Lightweight MVC architecture (Model-View-Controller).
Backend	Netlify Functions (Node.js)	Secure serverless endpoints for shipping, orders, payments, and auth.
Database	Supabase (PostgreSQL)	Primary data layer for users, orders, and commissions.
Auth	Supabase Auth	Role-based authentication (Admin, User).
Payments	Midtrans Snap API	Secure sandbox & production payment processing.
Shipping	RajaOngkir & Komerce APIs	Real-time shipping cost, service, and pickup scheduling.
🧩 Architecture Overview
Frontend (public/)
 ├── checkout.html
 │    ├── assets/js/controllers/CheckoutController.js
 │    ├── assets/js/models/CheckoutModel.js
 │    └── assets/js/views/CheckoutView.js
 ├── payment.html
 ├── successful-payment.html
 ├── pending-payment.html
 ├── failed-payment.html
 ├── pages/admin-dashboard.html
 │    ├── assets/js/controllers/AdminController.js
 │    ├── assets/js/models/AdminModel.js
 │    └── assets/js/views/AdminView.js
 └── pages/vendor-dashboard.html (planned)

Netlify Functions (netlify/functions/)
 ├── auth-login.js
 ├── auth-register.js
 ├── create-order.js
 ├── admin-get-orders.js
 ├── admin-update-order.js
 ├── admin-get-order-details.js
 ├── create-shipping-order.js
 ├── create-komerce-pickup.js
 ├── create-komerce-label.js
 ├── payment-callback.js
 ├── create-transaction.js
 └── api.js  ← unified router for local API calls

Database (Supabase)
 ├── users
 │    ├── id UUID (auth.uid)
 │    ├── email TEXT
 │    ├── role TEXT ('admin' | 'user')
 │    └── ...
 ├── orders
 │    ├── order_id UUID
 │    ├── user_id UUID
 │    ├── total NUMERIC
 │    ├── status TEXT
 │    ├── shipping_provider TEXT
 │    ├── payment_status TEXT
 │    ├── created_at, updated_at TIMESTAMPTZ
 │    └── ...
 └── commissions (linked to orders)
🚀 Key Features
🛒 Checkout & Orders
Realtime shipping rate updates via RajaOngkir or Komerce Delivery API.
Persistent cart and address data in localStorage.
Secure order creation via Netlify function create-order.js.
💳 Payments
Midtrans Snap sandbox integration.
Full success/pending/failure redirect flow.
Real-time order payment status updates.
🚚 Shipping & Pickup
Dynamic courier/service selection.
Live ETD & cost rendering.
Komerce pickup and label generation.
🔐 Authentication
User and Admin roles via Supabase Auth.
First registered user auto-assigned as admin.
Local storage persistence for user_role and auth_token.
🧑‍💼 Admin Dashboard
Role-restricted /pages/admin-dashboard.html.
Search, filter, update order status with toast notifications.
Modal details for each order (customer, shipping, payment, items).
Live timestamps (updated_at) and secure role validation.
📦 Local Development Setup
# 1. Clone repo
git clone https://github.com/neilecm/simplepage.git
cd simplepage

# 2. Install dependencies
npm install

# 3. Run local Netlify Dev environment
netlify dev
Then open http://localhost:8888.
🔐 Environment Variables
Add the following to your .env file (already injected in Netlify Dev):
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
SUPABASE_ANON_KEY=your-supabase-anon-key
RAJAONGKIR_API_KEY=your-rajaongkir-key
RAJAONGKIR_DELIVERY_KEY=your-komerce-key
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
🧭 Deployment
Deploy on Netlify (connect this GitHub repo).
Set environment variables in Netlify Dashboard → Site Settings → Environment.
Enable Supabase Auth (email confirmation ON for production).
Switch Midtrans to Production in /netlify/functions/create-transaction.js.
📅 Milestone: v1.0.0
✅ Full-stack integration completed.
✅ Admin dashboard working end-to-end.
✅ Midtrans payments & Komerce shipping verified.
✅ Supabase Auth and role-based protection enabled.

🧱 System Architecture
Text/Markdown (for README)
                        ┌──────────────────────────────────────────┐
                        │          🧠 CERA BRASILEIRA              │
                        │        Frontend (HTML + JS + CSS)        │
                        │  - Checkout / Products / Admin Pages     │
                        │  - MVC Architecture                      │
                        │  - Auth & LocalStorage                   │
                        └──────────────┬───────────────────────────┘
                                       │
                    (1) HTTPS Request  │  via Netlify Functions (API Gateway)
                                       ▼
          ┌──────────────────────────────────────────┐
          │        ⚙️ NETLIFY FUNCTIONS BACKEND       │
          │-------------------------------------------│
          │  /auth-register.js     → Supabase Auth     │
          │  /auth-login.js        → Supabase Auth     │
          │  /create-order.js      → Supabase DB       │
          │  /admin-get-orders.js  → Supabase DB       │
          │  /admin-update-order.js → Supabase DB      │
          │  /create-transaction.js → Midtrans API     │
          │  /shipping.js           → RajaOngkir API   │
          │  /create-komerce-label  → Komerce API      │
          └───────────────┬────────────────────────────┘
                          │
                          │ (2) Secure Supabase Service Role Connection
                          ▼
        ┌───────────────────────────────────────────────┐
        │                🗄️ SUPABASE                    │
        │-----------------------------------------------│
        │ Auth: user login, roles, token validation     │
        │ Database: users, orders, commissions, vendors │
        │ Row-Level Security (RLS) for user isolation   │
        └───────────────────────┬───────────────────────┘
                                │
                                │ (3) External Services
                                ▼
         ┌───────────────────────────────┬──────────────────────────────┐
         │         💳 MIDTRANS           │          🚚 SHIPPING         │
         │-------------------------------│------------------------------│
         │ Payments API (Snap / Sandbox) │ RajaOngkir / Komerce APIs   │
         │ Sends callbacks → payment.js  │ Real-time cost calculation   │
         │ Updates order status in DB    │ Label & pickup management    │
         └───────────────────────────────┴──────────────────────────────┘
📊 Optional Visual Diagram (PNG layout suggestion)
You can upload this as an image named architecture-diagram.png and link it in your README:
![System Architecture](public/assets/images/architecture-diagram.png)
Visual layout structure:
[ User Browser ]
       │
       ▼
[ Frontend (Netlify static) ]
       │
       ▼
[ Netlify Functions (API Layer) ]
   ├── Auth (register/login)
   ├── Orders (create, update, list)
   ├── Payments (Midtrans)
   └── Shipping (RajaOngkir/Komerce)
       │
       ▼
[ Supabase Backend ]
   ├── Auth
   ├── Database
   └── Row-Level Security
       │
       ▼
[ External APIs ]
   ├── Midtrans
   ├── RajaOngkir
   └── Komerce
🧭 Data Flow Summary
Step	Action	Component	Result
1️⃣	User logs in / registers	Frontend → /auth-register	Supabase Auth user + profile created
2️⃣	User checks out	/create-order	Order record created in Supabase
3️⃣	Midtrans Payment	/create-transaction → Midtrans API	Payment initiated, redirect to Snap
4️⃣	Callback received	/payment-callback	Order payment status updated
5️⃣	Admin dashboard loads	/admin-get-orders	Orders fetched from Supabase
6️⃣	Admin updates order	/admin-update-order	Status + timestamp updated