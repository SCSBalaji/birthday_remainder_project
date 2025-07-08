# 🎂 Birthday Buddy - Frontend

The React-based frontend application for Birthday Buddy, a full-stack birthday management system.

![React](https://img.shields.io/badge/React-19.1.0-blue)
![Vite](https://img.shields.io/badge/Vite-6.3.5-yellow)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## ✨ Features

### 🔐 **Authentication UI**
- **Registration Form**: User-friendly sign-up with validation
- **Login Form**: Secure sign-in with error handling
- **Protected Routes**: Automatic redirects for authenticated users
- **Session Management**: Persistent login state across browser sessions

### 🎯 **Birthday Management Interface**
- **Add Birthday Form**: Modal form with date picker and validation
- **Edit Birthday**: In-place editing with pre-filled data
- **Delete Confirmation**: Safe deletion with confirmation dialogs
- **Real-time Updates**: Instant UI updates after API operations

### 📱 **Multiple Views**
- **List View**: 
  - Grid layout of birthday cards
  - Search by name or notes
  - Filter by relationship type
  - Sort by date, name, or relationship
- **Calendar View**: 
  - Monthly grid with birthday markers
  - Navigation between months
  - Today highlighting
  - Birthday count badges

### 🎨 **Design & UX**
- **Responsive Design**: Mobile-first approach
- **Purple Gradient Theme**: Modern, cohesive color scheme
- **Smooth Animations**: Hover effects and transitions
- **Loading States**: User feedback during API calls
- **Error Handling**: Graceful error messages and recovery

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.1.0 | UI Framework & State Management |
| **Vite** | 6.3.5 | Build Tool & Development Server |
| **React Router** | 6.30.1 | Client-side Routing |
| **Axios** | 1.10.0 | HTTP Client for API calls |
| **React Context** | Built-in | Authentication State Management |
| **Custom CSS** | - | Styling & Responsive Design |
| **ESLint** | 9.25.0 | Code Quality & Linting |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ 
- npm or yarn package manager
- Backend server running on port 5000

### Installation
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint for code quality
```

## 📁 Project Structure
```
client/
├── public/                 # Static assets
├── src/
│   ├── contexts/          # React Context providers
│   │   └── AuthContext.jsx    # Authentication state management
│   ├── services/          # API service layer
│   │   └── api.js             # Axios configuration & API calls
│   ├── components/        # React components
│   │   ├── App.jsx            # Main application component
│   │   ├── CalendarView.jsx   # Calendar component
│   │   ├── SignUpPage.jsx     # Registration page
│   │   └── SignInPage.jsx     # Login page
│   ├── styles/            # CSS files
│   │   ├── App.css            # Main application styles
│   │   ├── CalendarView.css   # Calendar-specific styles
│   │   ├── SignUpPage.css     # Sign up page styles
│   │   ├── SignInPage.css     # Sign in page styles
│   │   └── index.css          # Global styles
│   ├── main.jsx           # Application entry point
│   └── mockBirthdays.js   # Mock data (legacy)
├── index.html             # HTML template
├── package.json           # Dependencies & scripts
├── vite.config.js         # Vite configuration
└── eslint.config.js       # ESLint configuration
```

## 🔧 Configuration
### Environment Variables
Create a `.env` file in the `client` directory if needed:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### API Configuration
API base URL is configured in `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```
For production, update this to your deployed backend URL.

## 🎨 Design System
### Color Palette
```css
Primary Gradient: radial-gradient(ellipse at top left, #191970 0%, #4e0066 100%)
Secondary: #ffb4fc (Pink accent)
Accent: #1fd1f9 (Cyan accent)
Cards: #18103d (Dark purple)
Inputs: #29214a (Medium purple)
```

### Typography
- **Font Family**: 'Segoe UI', Arial, sans-serif
- **Headings**: 700 weight, gradient text effects
- **Body**: 400-600 weight, high contrast

### Layout
- **Mobile-first**: Responsive grid system
- **Breakpoints**:
  - Mobile: < 700px
  - Tablet: 700px - 1200px
  - Desktop: > 1200px

## 🔌 API Integration
### Authentication Flow
```javascript
// Registration
authAPI.register({ name, email, password })
  .then(response => login(response.token, response.user))

// Login
authAPI.login({ email, password })
  .then(response => login(response.token, response.user))

// Auto-login from localStorage
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) setIsAuthenticated(true);
}, []);
```

### Birthday Operations
```javascript
// Fetch birthdays
birthdayAPI.getBirthdays()

// Create birthday
birthdayAPI.createBirthday({ name, date, relationship, bio })

// Update birthday
birthdayAPI.updateBirthday(id, { name, date, relationship, bio })

// Delete birthday
birthdayAPI.deleteBirthday(id)
```

## 🔒 Security Features
### Client-Side Security
- **JWT Token Storage**: Secure localStorage management
- **Automatic Logout**: Token expiry handling
- **Protected Routes**: Authentication guards
- **Input Validation**: Client-side form validation
- **CSRF Protection**: Token-based requests

### Error Handling
- **API Errors**: Graceful error messages
- **Network Failures**: Retry mechanisms
- **Token Expiry**: Automatic redirect to login
- **Form Validation**: Real-time validation feedback

## 🎯 Key Components
### AuthContext
```javascript
// Provides authentication state management
const { isAuthenticated, user, login, logout } = useAuth();
```

### API Service
```javascript
// Centralized API calls with token management
import { authAPI, birthdayAPI } from './services/api';
```

### Protected Route
```javascript
// Ensures only authenticated users access main app
<ProtectedRoute>
  <BirthdayBuddyHome />
</ProtectedRoute>
```

### Calendar Component
```javascript
// Displays birthdays in monthly calendar view
<CalendarView 
  birthdays={birthdays}
  year={year}
  month={month}
  onPrev={handlePrev}
  onNext={handleNext}
/>
```

## 📱 Responsive Design
### Mobile Optimizations
- **Touch-friendly**: Large tap targets
- **Swipe gestures**: Calendar navigation
- **Compact layouts**: Stacked cards on small screens
- **Optimized forms**: Mobile-friendly inputs

### Breakpoint System
```css
/* Mobile first approach */
.birthday-cards { grid-template-columns: 1fr; }

@media (min-width: 700px) {
  .birthday-cards { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1200px) {
  .birthday-cards { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
}
```

## 🚀 Performance Optimizations
### Bundle Optimization
- **Tree Shaking**: Unused code elimination
- **Code Splitting**: Dynamic imports for routes
- **Asset Optimization**: Compressed images and fonts
- **Lazy Loading**: Components loaded on demand

### Runtime Performance
- **React.memo**: Prevent unnecessary re-renders
- **useMemo**: Expensive calculations caching
- **useCallback**: Function reference stability
- **Virtual Scrolling**: For large birthday lists (future enhancement)

## 🔮 Future Enhancements
### Planned Features
- PWA Support: Offline functionality
- Push Notifications: Birthday reminders
- Dark/Light Theme: Theme switcher
- Photo Uploads: Profile pictures for contacts
- Data Export: CSV/PDF export functionality
- Social Sharing: Share birthday reminders

### Technical Improvements
- TypeScript: Type safety
- Testing: Unit and integration tests
- Storybook: Component documentation
- Performance Monitoring: Analytics integration

## 🧪 Testing
### Current Status
- **Manual Testing**: Comprehensive UI testing
- **Browser Testing**: Chrome, Firefox, Safari, Edge
- **Device Testing**: Mobile and desktop responsive testing

### Future Testing Strategy
```bash
# Planned testing setup
npm run test        # Unit tests with Vitest
npm run test:e2e    # End-to-end tests with Playwright
npm run test:coverage # Coverage reports
```

## 🚀 Production Deployment
### Build Process
```bash
# Create production build
npm run build

# Preview build locally
npm run preview
```

### Deployment Platforms
- **Vercel (Recommended)**: Zero-config deployment
- **Netlify**: Static site hosting
- **GitHub Pages**: Free hosting for public repos

### Production Configuration
- Update API base URL for production backend
- Configure environment variables
- Enable HTTPS for secure authentication
- Set up domain and SSL certificates

## 📊 Browser Support
| Browser | Version | Status |
|---|---|---|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| Mobile Safari | 14+ | ✅ Fully Supported |
| Chrome Mobile | 90+ | ✅ Fully Supported |

## 🤝 Contributing
### Development Setup
- Fork the repository
- Create feature branch
- Follow code style guidelines
- Test thoroughly before submission
- Create pull request with detailed description

### Code Style
- **ESLint**: Automatic code formatting
- **Prettier**: Code style consistency
- **Component Structure**: Functional components with hooks
- **CSS**: BEM methodology for class naming

## 📄 License
This project is licensed under the MIT License.

## 👨‍💻 Author
SCS Balaji - Frontend Developer

GitHub: @SCSBalaji
Frontend built with ❤️ using React and Vite