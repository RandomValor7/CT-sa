import { useEffect, useRef, useState } from 'react';
import Icono from '../../components/Icono.jsx';
import { Campo, Cargando, ErrorCarga } from '../../components/ui.jsx';
import { CabeceraAdmin } from '../../components/admin.jsx';
import NoEncontrada from '../NoEncontrada.jsx';
import { Link, useParams, useRuta } from '../../router.jsx';
import { useAvisos } from '../../context/Avisos.jsx';
import { api } from '../../api.js';

const VACIO = { usuario_id: '', numero_factura: '', monto: '', fecha_factura: '', estado: 'pendiente', notas: '' };

export default function FacturaForm() {
  const { id } = useParams();
  const editar = Boolean(id);
  const { avisar } = useAvisos();
  const { navegar } = useRuta();
  const archivo = useRef(null);
  const [opciones, setOpciones] = useState(null);
  const [factura, setFactura] = useState(null);
  const [error, setError] = useState(null);
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const pedidos = [api.get('/api/admin/facturas/formulario')];
    if (editar) pedidos.push(api.get(`/api/admin/facturas/${encodeURIComponent(id)}`));
    Promise.all(pedidos).then(([form, detalle]) => {
      if (!vivo) return;
      setOpciones(form);
      if (detalle) {
        const f = detalle.factura;
        setFactura(f);
        setValores({
          usuario_id: String(f.usuario_id), numero_factura: f.numero_factura ?? '', monto: f.monto ?? '',
          fecha_factura: f.fecha_factura ?? '', estado: f.estado, notas: f.notas ?? '',
        });
      } else if (form.usuarios.length > 0) {
        setValores((v) => ({ ...v, usuario_id: String(form.usuarios[0].id) }));
      }
    }).catch((e) => { if (vivo) setError(e); });
    return () => { vivo = false; };
  }, [id, editar]);

  if (error?.estado === 404) return <NoEncontrada />;
  if (error) return <ErrorCarga error={error} />;
  if (!opciones || (editar && !factura)) return <Cargando />;

  const cambiar = (e) => setValores((v) => ({ ...v, [e.target.name]: e.target.value }));

  const enviar = async (e) => {
    e.preventDefault();
    const datos = new FormData();
    Object.entries(valores).forEach(([k, v]) => datos.append(k, v ?? ''));
    if (archivo.current?.files?.[0]) datos.append('archivo', archivo.current.files[0]);
    setEnviando(true);
    setErrores({});
    try {
      const r = editar ? await api.put(`/api/admin/facturas/${id}`, datos) : await api.post('/api/admin/facturas', datos);
      avisar(r.message, 'success');
      navegar('/admin/facturas');
    } catch (err) {
      setErrores(err.errores);
      avisar(err.message, 'danger');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="container mx-auto p-6">
      <div className="contenido-cuadro visible max-w-lg mx-auto">
        <CabeceraAdmin titulo={editar ? 'Editar factura' : 'Nueva factura'} volverA="/admin/facturas" volverTexto="Volver al listado" />
        {editar && (
          <>
            <p className="text-xs text-gray-500 mt-3">Cliente: <strong>{factura.usuario_nombre}</strong> ({factura.usuario_email})</p>
            {factura.tieneArchivo && (
              <div className="mt-2">
                <a href={`/api/admin/facturas/${factura.id}/descargar`} className="text-sm hover:underline" style={{ color: 'var(--cian-suave)' }}>
                  <Icono n="download" /> Archivo actual
                </a>
              </div>
            )}
          </>
        )}
        <form onSubmit={enviar} className="mt-6" noValidate>
          <Campo id="usuario_id" etiqueta="Cliente" error={errores.usuario_id}>
            <select id="usuario_id" name="usuario_id" className="form-input" value={valores.usuario_id} onChange={cambiar}>
              {opciones.usuarios.map((u) => <option key={u.id} value={u.id}>{u.etiqueta}</option>)}
            </select>
          </Campo>
          <Campo id="numero_factura" etiqueta="Número de factura (opcional)" error={errores.numero_factura}>
            <input id="numero_factura" name="numero_factura" className="form-input" value={valores.numero_factura} onChange={cambiar} maxLength={50} />
          </Campo>
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo id="monto" etiqueta="Monto (opcional)" error={errores.monto}>
              <input id="monto" name="monto" type="number" step="0.01" min="0" className="form-input" value={valores.monto} onChange={cambiar} />
            </Campo>
            <Campo id="fecha_factura" etiqueta="Fecha de la factura (opcional)" error={errores.fecha_factura}>
              <input id="fecha_factura" name="fecha_factura" type="date" className="form-input" value={valores.fecha_factura} onChange={cambiar} />
            </Campo>
          </div>
          <Campo id="estado" etiqueta="Estado" error={errores.estado}>
            <select id="estado" name="estado" className="form-input" value={valores.estado} onChange={cambiar}>
              {opciones.estados.map((e) => <option key={e.valor} value={e.valor}>{e.etiqueta}</option>)}
            </select>
          </Campo>
          <Campo id="notas" etiqueta="Notas internas (opcional)" error={errores.notas}>
            <textarea id="notas" name="notas" rows={3} className="form-input" style={{ resize: 'vertical' }} value={valores.notas} onChange={cambiar} />
          </Campo>
          <Campo id="archivo" etiqueta={editar ? 'Reemplazar archivo (opcional)' : 'Archivo (opcional)'}>
            <input ref={archivo} type="file" id="archivo" name="archivo" accept="application/pdf,image/png,image/jpeg" className="form-input text-sm" />
          </Campo>
          <div className="flex gap-3">
            <button type="submit" className="button-primary" disabled={enviando}>{editar ? 'Guardar cambios' : 'Crear factura'}</button>
            <Link to="/admin/facturas" className="icon-btn">Cancelar</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
