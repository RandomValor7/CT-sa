import { useEffect, useRef, useState } from 'react';
import { Campo, Cargando, ErrorCarga } from '../../components/ui.jsx';
import { CabeceraAdmin } from '../../components/admin.jsx';
import NoEncontrada from '../NoEncontrada.jsx';
import { Link, useParams, useRuta } from '../../router.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { api } from '../../api.js';

export default function ProductoForm() {
  const { id } = useParams();
  const editar = Boolean(id);
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const archivo = useRef(null);
  const [producto, setProducto] = useState(null);
  const [error, setError] = useState(null);
  const [valores, setValores] = useState({ nombre: '', descripcion: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editar) return undefined;
    let vivo = true;
    api.get(`/api/admin/productos/${encodeURIComponent(id)}`)
      .then((r) => { if (vivo) { setProducto(r.producto); setValores({ nombre: r.producto.nombre, descripcion: r.producto.descripcion }); } })
      .catch((e) => { if (vivo) setError(e); });
    return () => { vivo = false; };
  }, [id, editar]);

  if (editar && error?.estado === 404) return <NoEncontrada />;
  if (editar && error) return <ErrorCarga error={error} />;
  if (editar && !producto) return <Cargando />;

  const cambiar = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const datos = new FormData();
    datos.append('nombre', valores.nombre);
    datos.append('descripcion', valores.descripcion);
    if (archivo.current?.files?.[0]) datos.append('imagen', archivo.current.files[0]);
    setEnviando(true);
    setErrores({});
    try {
      const r = editar ? await api.put(`/api/admin/productos/${id}`, datos) : await api.post('/api/admin/productos', datos);
      avisar(r.message, 'success');
      navegar('/admin/productos');
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  const titulo = editar ? 'Editar producto' : 'Nuevo producto';
  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible max-w-lg mx-auto">
        <CabeceraAdmin titulo={titulo} volverA="/admin/productos" volverTexto="Volver al catálogo" />
        {editar && producto.imagen && !producto.imagen.endsWith('logee.png') && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">Imagen actual:</p>
            <img src={producto.imagen} alt={producto.nombre} className="w-32 h-32 object-cover rounded border" />
          </div>
        )}
        <form onSubmit={enviar} className="mt-6" noValidate>
          <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
            <input id="nombre" name="nombre" className="form-input" value={valores.nombre} onChange={cambiar} />
          </Campo>
          <Campo id="descripcion" etiqueta="Descripción" error={errores.descripcion}>
            <textarea id="descripcion" name="descripcion" rows={4} className="form-input" style={{ resize: 'vertical' }} value={valores.descripcion} onChange={cambiar} />
          </Campo>
          <Campo id="imagen" etiqueta={editar ? 'Reemplazar imagen (opcional)' : 'Imagen (opcional)'}>
            <input ref={archivo} type="file" id="imagen" name="imagen" accept="image/png,image/jpeg,image/gif" className="form-input text-sm" />
          </Campo>
          <div className="flex gap-3">
            <button type="submit" className="button-primary" disabled={enviando}>{editar ? 'Guardar cambios' : 'Crear producto'}</button>
            <Link to="/admin/productos" className="icon-btn">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
