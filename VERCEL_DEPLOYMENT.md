# 🚀 Guía de Despliegue en Vercel - OrtotTrack Pro

## ✅ Ventajas de Vercel

- **Todo en un solo lugar**: Frontend + Backend + Base de Datos
- **Más simple** que configurar múltiples servicios
- **Gratis** para proyectos personales
- **Despliegue automático** desde GitHub

---

## 📋 Paso 1: Preparar el Repositorio

Asegúrate de que tu código esté en GitHub. Si aún no lo has hecho:

```bash
git add .
git commit -m "Configuración para Vercel"
git push
```

---

## 🌐 Paso 2: Crear Cuenta y Proyecto en Vercel

### 2.1 Crear cuenta
1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Sign Up"**
3. Conecta con tu cuenta de GitHub

### 2.2 Importar proyecto
1. En el dashboard de Vercel, haz clic en **"Add New..."** → **"Project"**
2. Busca tu repositorio `ortotrack-pro`
3. Haz clic en **"Import"**

---

## ⚙️ Paso 3: Configurar el Proyecto

### 3.1 Framework Preset
- Vercel debería detectar automáticamente **Vite**
- Si no, selecciona **"Vite"** manualmente

### 3.2 Build Settings
Vercel usará automáticamente:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.3 Variables de Entorno

**⚠️ MUY IMPORTANTE**: Antes de hacer clic en "Deploy", agrega la variable de entorno:

1. Expande la sección **"Environment Variables"**
2. Agrega:

```
Name: DATABASE_URL
Value: postgresql://neondb_owner:npg_tDAP6dVWS3qi@ep-rough-star-acmcs70k-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

3. Asegúrate de que esté marcada para **Production**, **Preview**, y **Development**

---

## 🚀 Paso 4: Desplegar

1. Haz clic en **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - Instala las dependencias
   - Construye el frontend
   - Configura las API routes
3. ¡Listo! Vercel te dará una URL como: `https://ortotrack-pro.vercel.app`

---

## ✅ Paso 5: Verificar

1. Abre la URL de tu proyecto
2. Intenta crear un profesional o paciente
3. Refresca la página
4. Los datos deberían persistir ✨

---

## 🔧 Estructura del Proyecto en Vercel

```
ortotrack-pro/
├── api/                    ← API Routes (Backend Serverless)
│   ├── db.js              ← Conexión a base de datos
│   ├── dentists/
│   │   ├── index.js       ← GET/POST /api/dentists
│   │   └── [id].js        ← PUT/DELETE /api/dentists/:id
│   ├── patients/
│   │   ├── index.js       ← GET/POST /api/patients
│   │   └── [id].js        ← PUT/DELETE /api/patients/:id
│   ├── appointments/
│   │   ├── index.js       ← GET/POST /api/appointments
│   │   └── [id].js        ← DELETE /api/appointments/:id
│   └── service-types/
│       └── index.js       ← GET/POST /api/service-types
├── components/            ← Componentes React
├── services/              ← Lógica del frontend
├── dist/                  ← Build del frontend (generado)
└── vercel.json           ← Configuración de Vercel
```

---

## 🐛 Solución de Problemas

### Error: "Module not found: pg"

Si ves este error en los logs:
1. Ve a tu proyecto en Vercel
2. Settings → General → Node.js Version
3. Asegúrate de que sea **18.x** o superior

### Los datos no se guardan

1. Verifica que `DATABASE_URL` esté configurada en **Environment Variables**
2. Ve a **Deployments** → Click en el último deployment → **Function Logs**
3. Busca errores en las funciones API

### Error de CORS

Si ves errores de CORS en la consola del navegador:
1. Verifica que los headers CORS estén en cada archivo de `/api`
2. Redesplega el proyecto

### La página muestra 404

1. Verifica que `vercel.json` esté en la raíz del proyecto
2. Asegúrate de que el `rewrites` esté configurado correctamente

---

## 🔄 Actualizaciones Futuras

Cada vez que hagas `git push`:
1. Vercel detectará automáticamente el cambio
2. Desplegará la nueva versión
3. Te notificará cuando esté listo

---

## 📝 Diferencias con el Servidor Local

### Desarrollo Local (npm run dev)
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/api`
- Necesitas ejecutar `server.js` por separado

### Producción en Vercel
- Todo en una URL: `https://tu-proyecto.vercel.app`
- Frontend: `/`
- Backend: `/api/*`
- Todo funciona automáticamente

---

## 🎯 Checklist Final

Antes de desplegar, verifica:

- [ ] Tu código está en GitHub
- [ ] Tienes el archivo `vercel.json` en la raíz
- [ ] La carpeta `/api` existe con todas las rutas
- [ ] Has configurado `DATABASE_URL` en Vercel
- [ ] El archivo `.gitignore` incluye `.env`

---

¡Listo! Tu aplicación debería estar funcionando en Vercel. 🎉

**URL de tu proyecto**: Vercel te la mostrará después del despliegue.
