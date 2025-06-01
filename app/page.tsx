"use client";

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Sistema de Gestión de Eventos</h1>
      <p className="text-xl mb-8">Bienvenido</p>
      <div className="flex space-x-4">
        <Link href="/registro" passHref>
          <button className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Registrarse</button>
        </Link>
        <Link href="/login" passHref>
           <button className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">Iniciar Sesión</button>
        </Link>
      </div>
    </div>
  );
}
