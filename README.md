# E-Tailoring
A production-ready for Nigerian e-tailoring platform built with Next.js and MySQL. This platform connects customers with local tailors for custom clothing orders.

## Features

### Customer Features
- Browse marketplace styles and tailor-uploaded designs
- Place custom orders with detailed measurements
- Real-time order tracking
- Chat directly with assigned tailors
- Pay by bank transfer directly to the assigned tailor
- Order history and status updates

### Tailor Features
- Dashboard with order statistics and analytics
- Order management and status updates
- Real-time order tracking
- Customer communication via chat
- Upload, showcase and manage personal design catalog
- Performance metrics and revenue tracking

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Database**: MySQL with mysql2 + raw SQL queries
- **Authentication**: JWT-based authentication
- **Styling**: Tailwind CSS
- **Real-time**: Polling-based updates (can be upgraded to WebSocket)

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd E-Tailoring
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```
DATABASE_URL="mysql://user:password@localhost:3306/etailoring"
JWT_SECRET="your-super-secret-jwt-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
# Create database & tables
npm run db:setup

# Seed sample styles (optional)
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── customer/          # Customer-facing pages
│   ├── tailor/            # Tailor-facing pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── layout/            # Layout components
│   └── ui/                # UI components
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # MySQL connection helpers
│   └── utils.ts          # General utilities
├── database/             # SQL schema definitions
├── scripts/              # Setup & seed scripts
└── public/               # Static assets
```

## Database Schema

The application uses the following main models:
- **User**: Customers and tailors
- **Order**: Customer orders
- **Style**: Platform styles and tailor-uploaded designs
- **Measurement**: Order measurements
- **Payment**: Payment records
- **Message**: Chat messages
- **OrderStatusHistory**: Order status tracking

## API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Customer
- `GET /api/customer/orders` - Get customer orders
- `POST /api/customer/orders` - Create new order
- `GET /api/customer/orders/[id]` - Get order details

### Tailor
- `GET /api/tailor/stats` - Get dashboard statistics
- `GET /api/tailor/orders` - Get tailor orders
- `GET /api/tailor/orders/[id]` - Get order details
- `GET /api/tailor/designs` - List tailor designs
- `POST /api/tailor/designs` - Create new design
- `PATCH /api/tailor/designs/[id]` - Update design
- `DELETE /api/tailor/designs/[id]` - Delete design

### Profile
- `GET /api/profile` - Fetch current user profile (and tailor bank details)
- `PUT /api/profile` - Update personal information and bank details

### Orders
- `GET /api/orders/[id]/messages` - Get order messages
- `POST /api/orders/[id]/messages` - Send message
- `PATCH /api/orders/[id]/status` - Update order status

## Payment Flow

Payments now happen via direct bank transfer. Each tailor maintains verified bank details inside their profile. When a customer places an order, the assigned tailor’s account information appears on the order detail page so the customer can transfer funds and share the receipt in chat.

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Make sure to set all environment variables in your production environment, especially:
- `DATABASE_URL` - Production database connection
- `JWT_SECRET` - Strong secret key
- `NEXT_PUBLIC_APP_URL` - Production URL

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens stored in httpOnly cookies
- Role-based access control for API routes
- Input validation using Zod
- SQL injection protection via parameterized mysql2 queries

## Future Enhancements

- WebSocket integration for real-time updates
- Image upload for style customization
- Review and rating system
- Email notifications
- SMS notifications via Twilio
- Advanced analytics dashboard
- Multi-language support

## License

This project is proprietary software.

## Support

For issues and questions, please contact the development team.

