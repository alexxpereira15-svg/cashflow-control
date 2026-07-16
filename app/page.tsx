'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

// Interfaces formales basadas en nuestro Plan Técnico
interface Deuda {
  id: string
  nombre_deuda: string
  tipo_deuda: 'tarjeta_credito' | 'prestamo_fijo'
  saldo_total_actual: number
  tasa_interes_anual_sin_iva: number
  aplica_iva_interes: boolean
  pago_para_no_generar_intereses: number
  pago_minimo_sugerido: number
  dia_corte?: number
  dia_pago: number
}

interface Transaccion {
  id: string
  tipo: 'ingreso' | 'gasto_fijo' | 'gasto_variable' | 'pago_deuda' | 'ahorro'
  monto: number
  fecha: string
  categoria: string
  subcategoria?: string
  detalle?: string
}

interface Cajita {
  id: string
  nombre_cajita: string
  monto_guardado: number
  meta_ahorro: number
}

interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo_alerta: 'liquidez' | 'vencimiento' | 'logro'
  leida: boolean
}

export default function Dashboard() {
  const supabase = createClient()

  // Estado de Autenticación
  const [session, setSession] = useState<any>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Navegación del Panel Lateral
  const [activeTab, setActiveTab] = useState<'dashboard' | 'deudas' | 'cajitas' | 'transacciones'>('dashboard')

  // Datos de Supabase
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [cajitas, setCajitas] = useState<Cajita[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [showTransaccionModal, setShowTransaccionModal] = useState(false)
  const [showDeudaModal, setShowDeudaModal] = useState(false)
  const [showCajitaModal, setShowCajitaModal] = useState(false)

  // Formularios
  const [formTransaccion, setFormTransaccion] = useState({
    tipo: 'gasto_variable',
    monto: '',
    categoria: '',
    subcategoria: '',
    detalle: ''
  })

  const [formDeuda, setFormDeuda] = useState({
    nombre_deuda: '',
    tipo_deuda: 'tarjeta_credito',
    saldo_total_actual: '',
    tasa_interes_anual_sin_iva: '',
    aplica_iva_interes: true,
    pago_para_no_generar_intereses: '',
    pago_minimo_sugerido: '',
    dia_corte: '',
    dia_pago: ''
  })

  const [formCajita, setFormCajita] = useState({
    nombre_cajita: '',
    monto_guardado: '',
    meta_ahorro: ''
  })

  // Verificar si hay sesión activa al montar el componente
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        cargarDatos()
      } else {
        setLoading(false)
      }
    }

    checkSession()

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        cargarDatos()
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Iniciar Sesión de forma segura
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setAuthError('Credenciales incorrectas. Verifica tu correo y contraseña.')
      setAuthLoading(false)
    }
  }

  // Cerrar Sesión
  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setDeudas([])
    setTransacciones([])
    setCajitas([])
    setNotificaciones([])
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      // Consultas a Supabase
      const { data: d } = await supabase.from('deudas').select('*')
      const { data: t } = await supabase.from('transacciones').select('*').order('fecha', { ascending: false })
      const { data: c } = await supabase.from('cajitas_ahorro').select('*')
      const { data: n } = await supabase.from('notificaciones').select('*').order('creado_en', { ascending: false })

      if (d) setDeudas(d)
      if (t) setTransacciones(t)
      if (c) setCajitas(c)
      if (n) setNotificaciones(n)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Guardar Transacción
  const handleTransaccionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return alert('Debes iniciar sesión')

    const { error } = await supabase.from('transacciones').insert([{
      usuario_id: session.user.id,
      tipo: formTransaccion.tipo,
      monto: parseFloat(formTransaccion.monto),
      categoria: formTransaccion.categoria,
      subcategoria: formTransaccion.subcategoria === '' ? null : formTransaccion.subcategoria,
      detalle: formTransaccion.detalle
    }])

    if (error) alert(error.message)
    else {
      setShowTransaccionModal(false)
      setFormTransaccion({ tipo: 'gasto_variable', monto: '', categoria: '', subcategoria: '', detalle: '' })
      cargarDatos()
    }
  }

  // Guardar Deuda
  const handleDeudaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return alert('Debes iniciar sesión')

    const { error } = await supabase.from('deudas').insert([{
      usuario_id: session.user.id,
      nombre_deuda: formDeuda.nombre_deuda,
      tipo_deuda: formDeuda.tipo_deuda,
      saldo_total_actual: parseFloat(formDeuda.saldo_total_actual),
      tasa_interes_anual_sin_iva: parseFloat(formDeuda.tasa_interes_anual_sin_iva),
      aplica_iva_interes: formDeuda.aplica_iva_interes,
      pago_para_no_generar_intereses: parseFloat(formDeuda.pago_para_no_generar_intereses) || 0,
      pago_minimo_sugerido: parseFloat(formDeuda.pago_minimo_sugerido) || 0,
      dia_corte: formDeuda.tipo_deuda === 'tarjeta_credito' ? parseInt(formDeuda.dia_corte) : null,
      dia_pago: parseInt(formDeuda.dia_pago)
    }])

    if (error) alert(error.message)
    else {
      setShowDeudaModal(false)
      setFormDeuda({
        nombre_deuda: '', tipo_deuda: 'tarjeta_credito', saldo_total_actual: '',
        tasa_interes_anual_sin_iva: '', aplica_iva_interes: true,
        pago_para_no_generar_intereses: '', pago_minimo_sugerido: '', dia_corte: '', dia_pago: ''
      })
      cargarDatos()
    }
  }

  // Guardar Cajita
  const handleCajitaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return alert('Debes iniciar sesión')

    const { error } = await supabase.from('cajitas_ahorro').insert([{
      usuario_id: session.user.id,
      nombre_cajita: formCajita.nombre_cajita,
      monto_guardado: parseFloat(formCajita.monto_guardado) || 0,
      meta_ahorro: parseFloat(formCajita.meta_ahorro) || null
    }])

    if (error) alert(error.message)
    else {
      setShowCajitaModal(false)
      setFormCajita({ nombre_cajita: '', monto_guardado: '', meta_ahorro: '' })
      cargarDatos()
    }
  }

  // Marcar Notificación como Leída
  const marcarNotificacionLeida = async (id: string) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    cargarDatos()
  }

  // --- CÁLCULOS DEL MOTOR FINANCIERO ---
  const ingresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((acc, c) => acc + c.monto, 0)
  const gastos = transacciones.filter(t => t.tipo.startsWith('gasto')).reduce((acc, c) => acc + c.monto, 0)
  const saldoDisponible = ingresos - gastos

  // Calcular Interés Mensual Estimado de las deudas (Fórmula con IVA del Plan Técnico)
  const calcularInteresMensualReal = (deuda: Deuda) => {
    const tasaMensualNominal = (deuda.tasa_interes_anual_sin_iva / 100) / 12
    const tasaMensualConIva = deuda.aplica_iva_interes ? tasaMensualNominal * 1.16 : tasaMensualNominal
    return deuda.saldo_total_actual * tasaMensualConIva[cite: 1]
  }

  const totalInteresesEstimados = deudas.reduce((acc, d) => acc + calcularInteresMensualReal(d), 0)

  // --- VISTA 1: PANTALLA DE LOGIN SI NO HAY SESIÓN ---
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">💸</span>
            <h1 className="text-2xl font-black text-emerald-400 tracking-wider">Cashflow Control</h1>
            <p className="text-gray-400 text-sm">Ingresa para gestionar tu motor financiero</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs text-center font-medium">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correo Electrónico</label>
              <input 
                type="email" required value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm"
                placeholder="tu@correo.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contraseña</label>
              <input 
                type="password" required value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 transition-all text-sm"
                placeholder="••••••••" />
            </div>
            <button 
              type="submit" disabled={authLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-lg transition-all text-sm flex justify-center items-center">
              {authLoading ? 'Iniciando sesión...' : 'Entrar al Dashboard'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- VISTA 2: DASHBOARD COMPLETO (SÓLO SI HAY SESIÓN) ---
  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100 font-sans">
      
      {/* 1. PANEL LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl">💸</span>
            <span className="text-xl font-bold text-emerald-400 tracking-wider">Cashflow Control</span>
          </div>
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600/20 text-emerald-400 border-l-4 border-emerald-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              📊 Resumen General
            </button>
            <button 
              onClick={() => setActiveTab('deudas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'deudas' ? 'bg-rose-600/20 text-rose-400 border-l-4 border-rose-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              💳 Deudas & Amortización
            </button>
            <button 
              onClick={() => setActiveTab('cajitas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'cajitas' ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              📥 Cajitas de Ahorro
            </button>
            <button 
              onClick={() => setActiveTab('transacciones')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'transacciones' ? 'bg-amber-600/20 text-amber-400 border-l-4 border-amber-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              📜 Historial Operativo
            </button>
          </nav>
        </div>
        <div className="p-6 border-t border-gray-800 space-y-3">
          <p className="text-[11px] text-gray-500 truncate">Usuario: {session.user.email}</p>
          <button 
            onClick={handleLogout}
            className="w-full bg-gray-850 hover:bg-gray-800 text-xs py-2 rounded border border-gray-800 transition-all font-semibold text-rose-400">
            Cerrar Sesión 🚪
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        
        {/* BARRA SUPERIOR (CENTRO DE NOTIFICACIONES) */}
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur px-8 flex justify-between items-center">
          <h2 className="text-lg font-bold">
            {activeTab === 'dashboard' && 'Resumen General'}
            {activeTab === 'deudas' && 'Amortización Dinámica de Deudas'}
            {activeTab === 'cajitas' && 'Mis Cajitas de Ahorro'}
            {activeTab === 'transacciones' && 'Historial de Movimientos'}
          </h2>
          
          {/* Bandeja de Alertas */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="relative p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-all">
                🔔
                {notificaciones.filter(n => !n.leida).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                    {notificaciones.filter(n => !n.leida).length}
                  </span>
                )}
              </button>
              {/* Dropdown Alertas */}
              <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl hidden group-hover:block z-50 p-4">
                <h4 className="text-xs font-bold text-gray-400 mb-3 border-b border-gray-800 pb-2">Notificaciones Inteligentes</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <p className="text-xs text-gray-500">No hay alertas en este momento.</p>
                  ) : (
                    notificaciones.map(n => (
                      <div key={n.id} className={`p-2 rounded text-xs transition-all ${n.leida ? 'opacity-50' : 'bg-gray-800'}`}>
                        <div className="flex justify-between font-semibold">
                          <span className={n.tipo_alerta === 'liquidez' ? 'text-rose-400' : 'text-emerald-400'}>{n.titulo}</span>
                          {!n.leida && (
                            <button onClick={() => marcarNotificacionLeida(n.id)} className="text-[10px] text-emerald-400 hover:underline">Leída</button>
                          )}
                        </div>
                        <p className="text-gray-300 mt-1">{n.mensaje}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setShowTransaccionModal(true)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold transition-all">+ Transacción</button>
            <button onClick={() => setShowDeudaModal(true)} className="bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-lg text-sm font-bold transition-all">+ Deuda</button>
          </div>
        </header>

        {/* ÁREA DE CONTENIDO */}
        <main className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <span className="text-emerald-400 text-lg animate-pulse">Sincronizando con Supabase...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD COMPLETO */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Tarjetas de Balance */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Balance en Cuenta</p>
                      <h3 className={`text-3xl font-extrabold mt-2 ${saldoDisponible >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        ${saldoDisponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Interés Mensual Real Estimado</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-rose-400">
                        ${totalInteresesEstimados.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Cajitas de Ahorro</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-blue-400">
                        ${cajitas.reduce((acc, c) => acc + c.monto_guardado, 0).toLocaleString('es-MX')}
                      </h3>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Deudas Registradas</p>
                      <h3 className="text-3xl font-extrabold mt-2 text-rose-500">
                        ${deudas.reduce((acc, d) => acc + d.saldo_total_actual, 0).toLocaleString('es-MX')}
                      </h3>
                    </div>
                  </div>

                  {/* Fila Media: Amortización Rápida y Cajitas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tarjeta de Amortización Rápida */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-rose-400">Amortización de Deudas</h3>
                        <button onClick={() => setActiveTab('deudas')} className="text-xs text-gray-400 hover:text-white">Ver Detalles →</button>
                      </div>
                      <div className="space-y-4">
                        {deudas.slice(0, 3).map(d => {
                          const interesMensual = calcularInteresMensualReal(d)[cite: 1]
                          return (
                            <div key={d.id} className="p-3 bg-gray-950 rounded border border-gray-800 flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold text-sm">{d.nombre_deuda}</h4>
                                <p className="text-xs text-gray-400">Tasa: {d.tasa_interes_anual_sin_iva}% + IVA</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-rose-400">${d.saldo_total_actual.toLocaleString('es-MX')}</p>
                                <p className="text-[10px] text-gray-400">Int. Mensual: ${interesMensual.toFixed(2)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Cajitas Rápidas */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-blue-400">Cajitas de Ahorro</h3>
                        <button onClick={() => setShowCajitaModal(true)} className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded">Crear Cajita</button>
                      </div>
                      <div className="space-y-4">
                        {cajitas.slice(0, 3).map(c => {
                          const progreso = c.meta_ahorro ? (c.monto_guardado / c.meta_ahorro) * 100 : 100
                          return (
                            <div key={c.id} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-semibold">{c.nombre_cajita}</span>
                                <span className="text-gray-400">${c.monto_guardado.toLocaleString()} / ${c.meta_ahorro?.toLocaleString() || 'N/A'}</span>
                              </div>
                              <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(progreso, 100)}%` }}></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETALLE DE DEUDAS */}
              {activeTab === 'deudas' && (
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-rose-400">Detalle de Instrumentos Financieros y Tarjetas</h3>
                    <button onClick={() => setShowDeudaModal(true)} className="bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded text-sm font-bold transition-all">Añadir Nueva Deuda</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-sm">
                          <th className="pb-3">Deuda / Banco</th>
                          <th className="pb-3">Tipo</th>
                          <th className="pb-3">Saldo</th>
                          <th className="pb-3">Tasa (+ IVA)</th>
                          <th className="pb-3">Pago No Gen. Interés</th>
                          <th className="pb-3 text-right">Interés Mensual Real (Con IVA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-sm">
                        {deudas.map(d => {
                          const interesMensual = calcularInteresMensualReal(d)[cite: 1]
                          return (
                            <tr key={d.id} className="hover:bg-gray-850">
                              <td className="py-4 font-semibold text-gray-200">{d.nombre_deuda}</td>
                              <td className="py-4 uppercase text-xs text-gray-400">{d.tipo_deuda.replace('_', ' ')}</td>
                              <td className="py-4 font-bold text-rose-400">${d.saldo_total_actual.toLocaleString('es-MX')}</td>
                              <td className="py-4 text-gray-300">{d.tasa_interes_anual_sin_iva}% {d.aplica_iva_interes ? '+ IVA' : 'Sin IVA'}</td>
                              <td className="py-4 text-emerald-400 font-medium">${d.pago_para_no_generar_intereses.toLocaleString('es-MX')}</td>
                              <td className="py-4 text-right font-bold text-rose-500">${interesMensual.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CAJITAS DE AHORRO */}
              {activeTab === 'cajitas' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-blue-400">Tus Apartados y Fondos de Emergencia</h3>
                    <button onClick={() => setShowCajitaModal(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-bold transition-all">Nueva Cajita</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cajitas.map(c => {
                      const progreso = c.meta_ahorro ? (c.monto_guardado / c.meta_ahorro) * 100 : 100
                      return (
                        <div key={c.id} className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-200">{c.nombre_cajita}</h4>
                            <span className="text-xs font-bold text-blue-400">Cajita Activa</span>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Monto Acumulado</p>
                            <h3 className="text-2xl font-extrabold text-blue-400 mt-1">${c.monto_guardado.toLocaleString('es-MX')}</h3>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(progreso, 100)}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>Progreso: {progreso.toFixed(0)}%</span>
                              <span>Meta: ${c.meta_ahorro ? c.meta_ahorro.toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: TRANSACCIONES COMPLETAS */}
              {activeTab === 'transacciones' && (
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-amber-400">Registro Histórico Completo</h3>
                    <button onClick={() => setShowTransaccionModal(true)} className="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded text-sm font-bold transition-all text-white">Registrar Movimiento</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-sm">
                          <th className="pb-3">Detalle</th>
                          <th className="pb-3">Categoría</th>
                          <th className="pb-3">Subcategoría</th>
                          <th className="pb-3">Fecha</th>
                          <th className="pb-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-sm">
                        {transacciones.map(t => (
                          <tr key={t.id} className="hover:bg-gray-850">
                            <td className="py-4 font-medium text-gray-200">{t.detalle || 'Sin notas'}</td>
                            <td className="py-4 text-gray-400">{t.categoria}</td>
                            <td className="py-4 text-gray-500">{t.subcategoria || '-'}</td>
                            <td className="py-4 text-gray-400">{new Date(t.fecha).toLocaleDateString()}</td>
                            <td className={`py-4 text-right font-bold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}${t.monto.toLocaleString('es-MX')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* --- MODALES DE REGISTRO --- */}

      {/* MODAL TRANSACCIONES */}
      {showTransaccionModal && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-emerald-400">Registrar Transacción</h3>
            <form onSubmit={handleTransaccionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Operación</label>
                <select 
                  value={formTransaccion.tipo} 
                  onChange={(e) => setFormTransaccion({...formTransaccion, tipo: e.target.value as any})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white">
                  <option value="ingreso">Ingreso (Entrada)</option>
                  <option value="gasto_fijo">Gasto Fijo (Salida)</option>
                  <option value="gasto_variable">Gasto Variable (Salida)</option>
                  <option value="pago_deuda">Pago a Deuda</option>
                  <option value="ahorro">Apartado Ahorro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto ($ MXN)</label>
                <input 
                  type="number" step="0.01" required value={formTransaccion.monto}
                  onChange={(e) => setFormTransaccion({...formTransaccion, monto: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                  placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoría</label>
                  <input 
                    type="text" required value={formTransaccion.categoria}
                    onChange={(e) => setFormTransaccion({...formTransaccion, categoria: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="Ej. Transporte" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Subcategoría</label>
                  <input 
                    type="text" value={formTransaccion.subcategoria}
                    onChange={(e) => setFormTransaccion({...formTransaccion, subcategoria: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="Ej. Gasolina" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Detalle / Notas</label>
                <input 
                  type="text" value={formTransaccion.detalle}
                  onChange={(e) => setFormTransaccion({...formTransaccion, detalle: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                  placeholder="Notas adicionales..." />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowTransaccionModal(false)} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold text-white">Guardar Transacción</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEUDAS */}
      {showDeudaModal && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-rose-400">Añadir Nueva Deuda / Crédito</h3>
            <form onSubmit={handleDeudaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre de la Deuda</label>
                <input 
                  type="text" required value={formDeuda.nombre_deuda}
                  onChange={(e) => setFormDeuda({...formDeuda, nombre_deuda: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                  placeholder="Ej. Banregio Platino" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Deuda</label>
                  <select 
                    value={formDeuda.tipo_deuda} 
                    onChange={(e) => setFormDeuda({...formDeuda, tipo_deuda: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white text-xs">
                    <option value="tarjeta_credito">Tarjeta de Crédito</option>
                    <option value="prestamo_fijo">Préstamo Fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tasa Interés Anual (%)</label>
                  <input 
                    type="number" step="0.01" required value={formDeuda.tasa_interes_anual_sin_iva}
                    onChange={(e) => setFormDeuda({...formDeuda, tasa_interes_anual_sin_iva: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="45" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Saldo Actual ($)</label>
                  <input 
                    type="number" step="0.01" required value={formDeuda.saldo_total_actual}
                    onChange={(e) => setFormDeuda({...formDeuda, saldo_total_actual: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="12500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Día de Pago (Mensual)</label>
                  <input 
                    type="number" min="1" max="31" required value={formDeuda.dia_pago}
                    onChange={(e) => setFormDeuda({...formDeuda, dia_pago: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="16" />
                </div>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" id="aplica_iva" checked={formDeuda.aplica_iva_interes}
                  onChange={(e) => setFormDeuda({...formDeuda, aplica_iva_interes: e.target.checked})}
                  className="w-4 h-4 text-rose-500 bg-gray-950 border-gray-800 rounded" />
                <label htmlFor="aplica_iva" className="text-xs text-gray-300">Aplicar IVA (16%) en cálculo de intereses mensual[cite: 1]</label>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-gray-800 pt-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Para No Gen. Intereses</label>
                  <input 
                    type="number" step="0.01" value={formDeuda.pago_para_no_generar_intereses}
                    onChange={(e) => setFormDeuda({...formDeuda, pago_para_no_generar_intereses: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="Opcional" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pago Mínimo</label>
                  <input 
                    type="number" step="0.01" value={formDeuda.pago_minimo_sugerido}
                    onChange={(e) => setFormDeuda({...formDeuda, pago_minimo_sugerido: e.target.value})}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                    placeholder="Opcional" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowDeudaModal(false)} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-bold text-white">Guardar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CAJITAS */}
      {showCajitaModal && (
        <div className="fixed inset-0 bg-black/85 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-blue-400">Crear Apartado (Cajita)</h3>
            <form onSubmit={handleCajitaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre de la Cajita</label>
                <input 
                  type="text" required value={formCajita.nombre_cajita}
                  onChange={(e) => setFormCajita({...formCajita, nombre_cajita: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                  placeholder="Ej. Boda Civil" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto Inicial ($)</label>
                <input 
                  type="number" step="0.01" value={formCajita.monto_guardado}
                  onChange={(e) => setFormCajita({...formCajita, monto_guardado: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Meta de Ahorro ($)</label>
                <input 
                  type="number" step="0.01" value={formCajita.meta_ahorro}
                  onChange={(e) => setFormCajita({...formCajita, meta_ahorro: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-white" 
                  placeholder="Ej. 15000" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowCajitaModal(false)} className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white">Guardar Cajita</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
