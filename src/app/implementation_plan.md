# Plan de Refactorización Global del Diseño Móvil

La refactorización se enfocará en corregir los problemas de responsividad, desbordamiento (overflow) horizontal y usabilidad en dispositivos móviles, asegurando un diseño estable, fluido y accesible.

## 1. Comportamiento del Menú Hamburguesa (Navegación Móvil)
- **Bloqueo de Scroll**: Añadiré un `useEffect` en `MobileNavigation.tsx` que aplique `document.body.style.overflow = "hidden"` cuando el menú móvil esté abierto, y lo restaure al cerrarse. Esto evitará que la página principal haga scroll de fondo.
- **Drawer/Overlay**: El menú móvil actual ya usa un overlay (`fixed inset-0 z-50`), me aseguraré de que la transición sea fluida (tipo Drawer desde la derecha o izquierda) y de que tenga el `backdrop-blur-sm` y un fondo semitransparente oscuro sólido.
- **Área Táctil**: Ajustaré los paddings y tamaños de los botones del menú (especialmente el botón para cerrar `X`) para garantizar un área mínima táctil de 44x44px.

## 2. Prevención de Desbordamiento (Overflow)
- **Contenedor Principal (`main`)**: Modificaré `src/app/dashboard/layout.tsx` para asegurar que el `<main>` contenga `overflow-x-hidden`, conteniendo así cualquier desbordamiento interno.
- **Anchos Fijos**: Realizaré una búsqueda global para eliminar clases como `w-[800px]` o `w-[600px]`, cambiándolas por `w-full max-w-4xl` o aplicando `max-w-screen-xl` para pantallas de escritorio.

## 3. Gestión de Tablas Complejas (Tesorería y Secretaría)
Modificaré las vistas principales que usan tablas pesadas, en concreto:
- `TreasuryManagement.tsx` (Tesorería)
- `SecretariaInscripciones.tsx` (Secretaría / Expedientes)
- Envolveré la etiqueta `<table>` dentro de un `<div className="overflow-x-auto w-full pb-4">` para que el scroll ocurra *dentro* del contenedor de la tabla y no rompa la pantalla.

## 4. Botones y Formularios
- Buscaré los grupos de botones de acción (`flex gap-3`, `space-x-4`) y los cambiaré por flexbox responsivo: `flex flex-col md:flex-row w-full gap-3`. Esto hará que en móvil los botones (como Aprobar/Rechazar o Guardar/Cancelar) ocupen el 100% del ancho y se apilen verticalmente.

## 5. Tipografía y Truncamiento
- Ajustaré los textos de descripciones, conceptos y emails en las listas y tablas aplicando clases como `truncate` o `line-clamp-1` y `line-clamp-2`, de forma que terminen en "..." y no fuercen a la tarjeta o tabla a expandirse horizontalmente.

## 6. Cuadrícula (Grids)
- Revisaré componentes clave como el dashboard inicial, perfiles y modales que usan `grid grid-cols-2` y los convertiré a "Mobile First": `grid grid-cols-1 md:grid-cols-2`.

---

## User Review Required
> [!IMPORTANT]
> **Cambio de UI (Menú):** Voy a transformar el menú de móvil (que ahora ocupa toda la pantalla de golpe) para que deslice suavemente como un **"Drawer" desde la derecha** (o izquierda, según prefieras). ¿Te parece bien que se deslice desde la derecha?
> 
> **Tarjetas en Tablas:** Para el punto 3 de las Tablas... Envolver las tablas en scroll horizontal es muy rápido y limpio. Convertir las filas enteras a "Tarjetas (Cards)" requiere reconstruir el HTML por completo. Voy a empezar aplicando el Scroll Horizontal a las tablas (que soluciona el problema de inmediato), y si lo ves insuficiente, transformamos la de Tesorería a Tarjetas. ¿Conforme?

Quedo a la espera de tu luz verde para aplicar todos estos cambios de inmediato.
