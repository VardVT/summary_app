# Shipbuilding & Offshore Piping Design Ecosystem Shell

A unified interface and single sign-on (SSO) app launcher for shipbuilding and offshore piping design department applications. The shell manages authentication, project context, capability permissions, and embeds standalone child applications into a common content viewport via secure `postMessage` iframe context sharing.

---

## 1. How to Add a New App to `apps.ts`

All child applications are registered in a single central registry: `src/config/apps.ts`.

To register a new application, simply add a new object to the `APPS_CONFIG` array:

```typescript
{
  id: 'pipe-stress-analyzer',
  label: 'Piping Stress & Flexibility Analyzer',
  description: 'Finite element stress calculations, thermal expansion limits, and pipe support loads.',
  icon: 'Wrench', // Any Lucide icon name (e.g. Layers, FileText, Waypoints, Gauge, Cable, Wrench, etc.)
  category: 'Design', // Category: 'Design' | 'Control' | 'Materials' | 'Reporting'
  type: 'iframe',
  src: 'https://USERNAME.github.io/pipe-stress-analyzer/', // Standalone child app URL
  requiredCap: 'view_drawings', // Required capability: 'view_drawings' | 'edit_line_list' | 'view_mto' | 'export_reports' | 'approve_transmittals' | 'manage_apps'
  status: 'active', // 'active' | 'beta' | 'soon'
  rev: 'REV A', // Title block revision format
  tag: 'APP-09' // App reference code
}
```

The shell will automatically generate the left sidebar menu, home launcher cards, and capability-protected routes based on this single entry.

---

## 2. How to Set Supabase Environment Variables

The shell uses Supabase for email/password authentication and session management.

1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Retrieve your project **API URL** and **anon (public) key** from **Project Settings → API**.
3. Create or update your `.env` file in the root directory:

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

*Note: If these environment variables are missing or omitted, the application automatically runs in **Demo Mode** with mock engineering users and instant role switching.*

---

## 3. How to Deploy to Vercel

1. Push your code to a GitHub repository.
2. In Vercel, import the repository to create a new project.
3. Ensure the project settings use Vite defaults:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Base Path**: Ensure `base` in `vite.config.ts` is set to `'/'` (the default).
4. In **Vercel Project Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy** (or click **Redeploy** if environment variables were added after initial build).

---

## 4. How to Deploy to GitHub Pages

The repository includes an automated GitHub Actions deployment workflow located at `.github/workflows/deploy.yml`.

### Deployment Steps:
1. Push your code to the `main` (or `master`) branch on GitHub.
2. In your GitHub repository, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. *(Optional)* To enable Supabase authentication in production, add your Supabase credentials to **Settings → Secrets and variables → Actions → Repository secrets**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. The GitHub Action will automatically trigger, build the project, and deploy your applet to `https://USERNAME.github.io/REPOSITORY_NAME/`.

---

## 5. PostMessage SSO Integration Protocol

When embedding standalone child apps, the shell transmits session & project context after the iframe loads:

```javascript
// Sent from Shell to Child App window:
window.postMessage({
  type: 'SHELL_CONTEXT',
  accessToken: '...',
  refreshToken: '...',
  projectId: 'HN-1204',
  user: { name: 'Elena Rostova', role: 'lead', department: 'Piping Design' }
}, 'https://USERNAME.github.io');
```

Child apps can send notification events back to the shell:

```javascript
// Sent from Child App to Shell:
window.parent.postMessage({
  type: 'NOTIFY',
  title: 'ISO-PP-0123 Rev B Approved',
  body: 'Drawing approved by DNV inspector',
  category: 'drawing'
}, 'https://shell-app-domain.com');
```
