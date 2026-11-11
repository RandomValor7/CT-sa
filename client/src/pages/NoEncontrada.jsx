import { Link } from '../router.jsx';

export default function NoEncontrada() {
  return (
    <main className="container mx-auto p-6 text-center py-24">
      <div className="contenido-cuadro visible max-w-md mx-auto">
        <span className="eyebrow">Error 404</span>
        <p className="font-mono text-6xl font-bold my-4" style={{ color: 'var(--txt)' }}>◇ ◇ ◇</p>
        <h1 className="section-heading mb-2">Señal perdida</h1>
        <p className="text-gray-600 mb-6">La página que buscas no existe o fue movida.</p>
        <Link to="/" className="button-primary inline-block">Volver al inicio</Link>
      </div>
    </main>
  );
}
