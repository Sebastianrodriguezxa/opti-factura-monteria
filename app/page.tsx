"use client"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">OptiFactura Montería</h1>

        <p className="text-lg text-gray-600 mb-6">
          Sistema completo para análisis inteligente de facturas de servicios públicos
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-800 mb-2">📋 Características</h2>
          <ul className="text-gray-700 space-y-2">
            <li>✅ Web Scraping de tarifas oficiales</li>
            <li>✅ OCR avanzado para procesamiento de facturas</li>
            <li>✅ Detección automática de anomalías</li>
            <li>✅ Dashboard con análisis completo</li>
            <li>✅ API REST documentada</li>
            <li>✅ Autenticación con JWT</li>
          </ul>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-800 mb-2">🚀 Empezar</h2>
          <p className="text-gray-700 mb-4">Este es un proyecto Node.js/Express. Para ejecutarlo localmente:</p>
          <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto text-sm">
            {`npm install
cp .env.example .env
# Configura tu BASE DE DATOS en .env
npx prisma migrate dev
npm run seed
npm run dev`}
          </pre>
        </div>

        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-800 mb-2">🔗 Acceso</h2>
          <ul className="text-gray-700 space-y-1">
            <li>
              🏠 Principal: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000</code>
            </li>
            <li>
              📊 Dashboard: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000/dashboard.html</code>
            </li>
            <li>
              🔍 Análisis: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000/analizar.html</code>
            </li>
            <li>
              🔐 Login: <code className="bg-gray-200 px-2 py-1 rounded">http://localhost:3000/login.html</code>
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 text-left">
          <h2 className="font-semibold text-gray-800 mb-2">👤 Usuarios de Prueba</h2>
          <p className="text-gray-700">
            <strong>Admin:</strong> admin@optifactura.co / admin123
            <br />
            <strong>Test:</strong> test@optifactura.co / test123
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">Sistema completo y listo para producción ✨</p>
        </div>
      </div>
    </div>
  )
}
