# NerdAlert Frontend

A modern, responsive React frontend for the NerdAlert AI agent. Built with TypeScript, Vite, and React 19, providing an intuitive chat interface for pop-culture enthusiasts to interact with the NerdAlert AI.

## 🎯 Features

- **Modern React 19**: Built with the latest React features and hooks
- **TypeScript**: Full type safety and better developer experience
- **Vite**: Lightning-fast development server and build tooling
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Chat**: Interactive chat interface with the NerdAlert AI agent
- **Proxy Integration**: Seamless communication with the backend API
- **Hot Module Replacement**: Instant updates during development
- **ESLint Configuration**: Code quality and consistency enforcement

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [NerdAlert Agent](https://github.com/acidmaneth/nerdalert-project) running on `localhost:80`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/acidmaneth/nerdalert-project.git
   cd nerdalert-project/nerdalert-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173`

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

### Project Structure

```
nerdalert-frontend/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images, icons, and other assets
│   ├── components/      # React components
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── eslint.config.js     # ESLint configuration
```

### API Integration

The frontend is configured to communicate with the NerdAlert agent backend:

- **Development**: Proxies `/prompt-sync` requests to `http://localhost:80`
- **Production**: Configure the proxy target in `vite.config.ts`

### Configuration

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/prompt-sync': 'http://localhost:80', // Backend API
    },
  },
})
```

## 🎨 Customization

### Styling
The application uses CSS modules and global styles. You can customize:

- **Global styles**: Edit `src/index.css`
- **Component styles**: Create CSS modules for individual components
- **Theme**: Modify color variables and design tokens

### Components
The frontend is built with modular React components. Key components include:

- **Chat Interface**: Main chat component for AI interactions
- **Message Components**: Individual message display components
- **Input Components**: User input and form handling

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder with optimized production files.

### Deploy Options

1. **Static Hosting**: Deploy the `dist/` folder to services like:
   - Vercel
   - Netlify
   - GitHub Pages
   - AWS S3

2. **Docker**: Create a Dockerfile for containerized deployment

3. **CDN**: Serve static files through a CDN for better performance

### Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_API_URL=http://localhost:80
VITE_APP_TITLE=NerdAlert
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [NerdAlert Agent](https://github.com/acidmaneth/nerdalert-project) - The AI agent backend
- [LocalAI Integration](https://github.com/go-skynet/LocalAI) - Local AI inference

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/acidmaneth/nerdalert-project/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Built with ❤️ for the nerd community**
