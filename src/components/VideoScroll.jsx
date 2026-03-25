import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Evitamos errores de SSR en Astro
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const VideoScroll = ({ videoSrc, scrollHeight = "500vh" }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    let src = video.currentSrc || video.src;

    // 1. Hack para activar el video en iOS
    const handleTouchStart = () => {
      // El catch evita warnings en consola si el navegador interrumpe el play()
      video.play().then(() => video.pause()).catch(() => {});
      document.documentElement.removeEventListener("touchstart", handleTouchStart);
    };
    document.documentElement.addEventListener("touchstart", handleTouchStart);

    // 2. Configuración de la línea de tiempo de GSAP
    let tl = gsap.timeline({
      defaults: { duration: 1 },
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });

    // 3. Vincular el tiempo del video al scroll una vez cargada la metadata
    const setupAnimation = () => {
      tl.fromTo(
        video,
        { currentTime: 0 },
        { currentTime: video.duration || 1 }
      );
    };

    if (video.readyState >= 1) {
      setupAnimation();
    } else {
      video.addEventListener("loadedmetadata", setupAnimation);
    }

    // 4. Hack del Blob para optimizar la memoria y evitar saltos (lag) al retroceder
    const fetchBlob = async () => {
      if (window.fetch) {
        try {
          const response = await fetch(src);
          const blob = await response.blob();
          const blobURL = URL.createObjectURL(blob);

          const currentTime = video.currentTime;
          
          // Re-aplicamos el hack de iOS para la nueva URL del blob
          const handleTouchStartBlob = () => {
            video.play().then(() => video.pause()).catch(() => {});
            document.documentElement.removeEventListener("touchstart", handleTouchStartBlob);
          };
          document.documentElement.addEventListener("touchstart", handleTouchStartBlob);

          video.setAttribute("src", blobURL);
          video.currentTime = currentTime + 0.01;
        } catch (error) {
          console.error("Error cargando el Blob del video:", error);
        }
      }
    };

    const blobTimeout = setTimeout(fetchBlob, 1000);

    // 5. Limpieza al desmontar el componente (CRÍTICO en frameworks como Astro)
    return () => {
      document.documentElement.removeEventListener("touchstart", handleTouchStart);
      video.removeEventListener("loadedmetadata", setupAnimation);
      clearTimeout(blobTimeout);
      tl.kill(); 
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [videoSrc]);

  return (
    <>
      {/* El Video de Fondo (Estilos traducidos del CSS original) */}
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        preload="auto"
        muted
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          minWidth: '100%',
          minHeight: '100%',
          transform: 'translate(-50%, -50%)',
          objectFit: 'cover',
          zIndex: -1, // Lo mandamos al fondo
          pointerEvents: 'none' // Evita que interfiera con clicks en tu web
        }}
      />

      {/* El Contenedor que fuerza el scroll */}
      <div 
        id="container" 
        ref={containerRef} 
        style={{ height: scrollHeight, position: 'relative' }}
      >
        {/* Aquí puedes añadir otros componentes que quieras que floten sobre el video mientras haces scroll */}
      </div>
    </>
  );
};

export default VideoScroll;