'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// Interfaces para tipar nuestros datos de Supabase
interface Deuda {
  id: string
  nombre_deuda: string
  tipo_deuda: string
  saldo_total_actual: number
  tasa_interes_anual_sin_iva: number
  dia_pago: number
}

interface Transaccion {
  id: string
  tipo: string
  monto: number
  fecha: string
  categoria: string
  detalle: string
}

interface Cajita {
  id: string
  nombre_cajita: string
  monto_guardado: number
  meta_ahorro: number
}

export default function Dashboard() {
  const supabase = createClient()

  // Estados de los datos reales
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [cajitas, setCajitas] = useState<Cajita[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para abrir/cerrar Modales
  const [showTransaccionModal, setShowTransaccionModal] = useState(false)
  const [showDeudaModal, setShowDeudaModal] = useState(false)
  const [showCajitaModal, setShowCajitaModal] = useState(false)

  // Estados para los formularios
  const [nuevaTransaccion, setNuevaTransaccion] = useState({
    tipo: 'gasto_variable',
    monto: '',
    categoria: '',
    detalle: ''
  })

  const [nuevaDeuda, setNuevaDeuda] = useState({
    nombre_deuda: '',
    tipo_deuda: 'tarjeta_credito',
    saldo_total_actual: '',
    tasa_interes_anual_sin_iva: '',
    dia_pago: ''
  })

  const [nuevaCajita, setNuevaCajita] = useState({
    nombre_cajita: '',
    meta_ahorro: '',
    monto_guardado: '0'
  })

  // Cargar datos de Supabase al iniciar la página
  const cargarDatos = async () => {
    setLoading(true)
    try {
      // 1. Obtener Deudas
      const { data: dataDeudas } = await supabase.from('deudas').select('*')
      if (dataDeudas) setDeudas(dataDeudas)

      // 2. Obtener Transacciones
      const { data: dataTransacciones } = await supabase
        .from('transacciones')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(10)
      if (dataTransacciones) setTransacciones(dataTransacciones)

      // 3. Obtener Cajitas de Ahorro
      const { data: dataCajitas } = await supabase.from('cajitas_ahorro').select('*')
      if (dataCajitas) setCajitas(dataCajitas)

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Guardar Transacción
  const handleGuardarTransaccion = async (e: React.FormEvent) => {
    e.preventDefault()
    // Nota: Para un MVP simplificado asumimos un usuario fijo en sesión. 
    // Supabase RLS debe estar configurado para permitir la inserción.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Debes iniciar sesión')

    const { error } = await supabase.from('transacciones').insert([
      {
        usuario_id: user.id,
        tipo: nuevaTransaccion.tipo,
        monto: parseFloat(nuevaTransaccion.monto),
        categoria: nuevaTransaccion.categoria,
        detalle: nuevaTransaccion.detalle,
      }
    ])

    if (error) {
      alert('Error al guardar transacción: ' + error.message)
    } else {
      setShowTransaccionModal(false)
      setNuevaTransaccion({ tipo: 'gasto_variable', monto: '', categoria: '', detalle: '' })
      cargarDatos()
    }
  }

  // Guardar Deuda
  const handleGuardarDeuda = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Debes iniciar sesión')

    const { error } = await supabase.from('deudas').insert([
      {
        usuario_id: user.id,
        nombre_deuda: nuevaDeuda.nombre_deuda,
        tipo_deuda: nuevaDeuda.tipo_deuda,
        saldo_total_actual: parseFloat(nuevaDeuda.saldo_total_actual),
        tasa_interes_anual_sin_iva: parseFloat(nuevaDeuda.tasa_interes_anual_sin_iva),
        dia_pago: parseInt(nuevaDeuda.dia_pago),
      }
    ])

    if (error) {
      alert('Error al guardar deuda: ' + error.message)
    } else {
      setShowDeudaModal(false)
      setNuevaDeuda({ nombre_deuda: '', tipo_deuda: 'tarjeta_credito', saldo_total_actual: '', tasa_interes_anual_sin_iva: '', dia_pago: '' })
      cargarDatos()
    }
  }

  // Cálculos rápidos para el Dashboard
  const ingresosTotales = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((acc, curr) => acc + curr.monto, 0)

  const gastosTotales = transacciones
    .filter(t => t.tipo.startsWith('gasto'))
    .reduce((acc, curr) => acc + curr.monto, 0)

  const balanceNeto = ingresosTotales - gastosTotales

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">💸 Cashflow Control</h1>
          <p className="text-gray-400 text-sm">Tu centro de mando financiero</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowTransaccionModal(true)} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-all">
            + Transacción
          </button>
          <button 
            onClick={() => setShowDeudaModal(true)} 
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded transition-all">
            + Registrar Deuda
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-emerald-400 text-xl animate-pulse">Cargando tus finanzas...</p>
        </div>
      ) : (
        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* TARJETAS DE BALANCE GENERAL */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Balance Estimado</p>
              <h2 className={`text-3xl font-bold mt-2 ${balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                ${balanceNeto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Ingresos Registrados</p>
              <h2 className="text-3xl font-bold text-emerald-400 mt-2">
                ${ingresosTotales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Gastos Totales</p>
              <h2 className="text-3xl font-bold text-rose-400 mt-2">
                ${gastosTotales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          {/* COLUMNA DEUDAS */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-rose-400">⚠️ Mis Deudas</h3>
            {deudas.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin deudas pendientes registradas.</p>
            ) : (
              <div className="space-y-4">
                {deudas.map((deuda) => (
                  <div key={deuda.id} className="p-4 bg-gray-900 rounded-md border border-gray-700">
                    <div className="flex justify-between font-semibold">
                      <span>{deuda.nombre_deuda}</span>
                      <span className="text-rose-400">${deuda.saldo_total_actual.toLocaleString('es-MX')}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex justify-between">
                      <span>Tasa: {deuda.tasa_interes_anual_sin_iva}%</span>
                      <span>Día de pago: {deuda.dia_pago}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMNA TRANSACCIONES RECIENTES */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 md:col-span-2">
            <h3 className="text-xl font-bold mb-4 text-emerald-400">📜 Historial Reciente</h3>
            {transacciones.length === 0 ? (
              <p className="text-gray-500 text-sm">No has agregado transacciones aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-sm">
                      <th className="pb-3">Detalle</th>
                      <th className="pb-3">Categoría</th>
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {transacciones.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-750">
                        <td className="py-3 font-medium">{t.detalle || 'Sin descripción'}</td>
                        <td className="py-3 text-gray-400">{t.categoria}</td>
                        <td className="py-3 text-gray-400">{new Date(t.fecha).toLocaleDateString()}</td>
                        <td className={`py-3 text-right font-bold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toLocaleString('es-MX')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      )}

      {/* MODAL TRANSACCIONES */}
      {showTransaccionModal && (
        <div className="fixed inset-0 bg-black/75 flex justify-center items-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-emerald-400">Registrar Transacción</h3>
            <form onSubmit={handleGuardarTransaccion} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                <select 
                  value={nuevaTransaccion.tipo} 
                  onChange={(e) => setNuevaTransaccion({...nuevaTransaccion, tipo: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white">
                  <option value="ingreso">Ingreso (Entrada)</option>
                  <option value="gasto_variable">Gasto Variable (Salida)</option>
                  <option value="gasto_fijo">Gasto Fijo (Salida)</option>
                  <option value="ahorro">Ahorro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Monto ($)</label>
                <input 
                  type="number" step="0.01" required value={nuevaTransaccion.monto}
                  onChange={(e) => setNuevaTransaccion({...nuevaTransaccion, monto: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                <input 
                  type="text" required value={nuevaTransaccion.categoria}
                  onChange={(e) => setNuevaTransaccion({...nuevaTransaccion, categoria: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                  placeholder="Ej. Gasolina, Comida, Renta" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Detalle / Notas</label>
                <input 
                  type="text" value={nuevaTransaccion.detalle}
                  onChange={(e) => setNuevaTransaccion({...nuevaTransaccion, detalle: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                  placeholder="Ej. Gasolina para apoyar a mi mamá" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowTransaccionModal(false)} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-500 font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEUDAS */}
      {showDeudaModal && (
        <div className="fixed inset-0 bg-black/75 flex justify-center items-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-rose-400">Registrar Nueva Deuda</h3>
            <form onSubmit={handleGuardarDeuda} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de la Deuda</label>
                <input 
                  type="text" required value={nuevaDeuda.nombre_deuda}
                  onChange={(e) => setNuevaDeuda({...nuevaDeuda, nombre_deuda: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                  placeholder="Ej. TDC Banregio, Préstamo Coppel" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipo de Deuda</label>
                <select 
                  value={nuevaDeuda.tipo_deuda} 
                  onChange={(e) => setNuevaDeuda({...nuevaDeuda, tipo_deuda: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white">
                  <option value="tarjeta_credito">Tarjeta de Crédito</option>
                  <option value="prestamo_fijo">Crédito / Préstamo Fijo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Saldo Pendiente Actual ($)</label>
                <input 
                  type="number" step="0.01" required value={nuevaDeuda.saldo_total_actual}
                  onChange={(e) => setNuevaDeuda({...nuevaDeuda, saldo_total_actual: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                  placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tasa Interés Anual (%)</label>
                  <input 
                    type="number" step="0.01" required value={nuevaDeuda.tasa_interes_anual_sin_iva}
                    onChange={(e) => setNuevaDeuda({...nuevaDeuda, tasa_interes_anual_sin_iva: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                    placeholder="45" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Día de Pago (Mensual)</label>
                  <input 
                    type="number" min="1" max="31" required value={nuevaDeuda.dia_pago}
                    onChange={(e) => setNuevaDeuda({...nuevaDeuda, dia_pago: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" 
                    placeholder="16" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowDeudaModal(false)} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-650 rounded hover:bg-rose-500 font-bold text-white bg-rose-600">Guardar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
