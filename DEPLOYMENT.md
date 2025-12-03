# 🚀 Guía de Despliegue - OrtotTrack Pro

## 📋 Requisitos Previos

- Cuenta en [Render](https://render.com) (gratis)
- Cuenta en [Netlify](https://netlify.com) (gratis)
- Base de datos Neon ya configurada ✅

---

## 🔧 Parte 1: Desplegar el Backend en Render

### Paso 1: Crear el servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Haz clic en **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub/GitLab
4. Configura el servicio:
   - **Name**: `ortotrack-backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### Paso 2: Configurar Variables de Entorno

En la sección **Environment** de tu servicio en Render, agrega:

```
DATABASE_URL=postgresql://neondb_owner:npg_tDAP6dVWS3qi@ep-rough-star-acmcs70k-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NODE_ENV=production
```

### Paso 3: Desplegar

1. Haz clic en **"Create Web Service"**
2. Espera a que termine el despliegue (2-3 minutos)
3. **IMPORTANTE**: Copia la URL de tu backend (será algo como: `https://ortotrack-backend.onrender.com`)

---

## 🌐 Parte 2: Configurar y Desplegar el Frontend en Netlify

### Paso 1: Configurar Variable de Entorno en Netlify

1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com/)
2. Ve a **Site settings** → **Environment variables**
3. Agrega la siguiente variable:

```
VITE_API_URL=https://TU-BACKEND-URL.onrender.com/api
```

**⚠️ IMPORTANTE**: Reemplaza `TU-BACKEND-URL` con la URL que copiaste de Render en el Paso 3 anterior.

Ejemplo:
```
VITE_API_URL=https://ortotrack-backend.onrender.com/api
```

### Paso 2: Configurar Build Settings

En **Site settings** → **Build & deploy** → **Build settings**:

- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Paso 3: Redesplegar

1. Ve a **Deploys**
2. Haz clic en **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Espera a que termine el despliegue

---

## ✅ Verificación

Una vez desplegado todo:

1. Abre tu sitio en Netlify
2. Intenta crear un profesional o paciente
3. Refresca la página
4. Los datos deberían persistir ✨

---

## 🐛 Solución de Problemas

### Los datos no se guardan

1. Verifica que la variable `VITE_API_URL` en Netlify tenga la URL correcta
2. Abre la consola del navegador (F12) y busca errores
3. Verifica que el backend en Render esté activo (puede tardar 30-60 segundos en despertar si está inactivo)

### Error de CORS

Si ves errores de CORS en la consola:
1. Ve a `server.js`
2. Verifica que `app.use(cors())` esté presente
3. Redesplega el backend en Render

### El backend no inicia

1. Verifica los logs en Render Dashboard
2. Asegúrate de que `DATABASE_URL` esté configurada correctamente
3. Verifica que todas las dependencias estén en `package.json`

---

## 📝 Notas Importantes

- **Plan Gratuito de Render**: El backend se "duerme" después de 15 minutos de inactividad. La primera petición puede tardar 30-60 segundos en responder.
- **Base de Datos Neon**: Ya está configurada y lista para usar ✅
- **Variables de Entorno**: Nunca subas el archivo `.env` a GitHub. Usa `.env.example` como referencia.

---

## 🔄 Actualizaciones Futuras

Cuando hagas cambios en el código:

**Backend**:
1. Haz push a tu repositorio
2. Render desplegará automáticamente

**Frontend**:
1. Haz push a tu repositorio
2. Netlify desplegará automáticamente

---

¡Listo! Tu aplicación debería estar funcionando correctamente ahora. 🎉
