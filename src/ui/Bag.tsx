import { useEffect, useRef, useState } from 'react'
import { ehConsumivel, type ItemDaBag } from '../game/tipos'
import type { AcaoJogo, EstadoJogo } from '../game/estado'
import { buscarItem } from '../game/itens'

const SLOT_LABELS: Record<string, string> = {
  cabeca: 'Cabeça',
  colar: 'Colar',
  anel1: 'Anel 1',
  anel2: 'Anel 2',
  ombro: 'Ombro',
  torso: 'Torso',
  pulso: 'Pulsos',
  mao: 'Mãos',
  cintura: 'Cintura',
  perna: 'Calça',
  pe: 'Botas',
  arma: 'Arma',
  secundaria: 'Secundária',
}

export function Bag({ estado, despachar }: { estado: Readonly<EstadoJogo>, despachar: (acao: AcaoJogo) => void }) {
  const [contexto, setContexto] = useState<{ x: number, y: number, item: ItemDaBag } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function fechar() {
      setContexto(null)
    }
    window.addEventListener('click', fechar)
    return () => window.removeEventListener('click', fechar)
  }, [])

  function onContextMenu(e: React.MouseEvent, item: ItemDaBag) {
    e.preventDefault()
    setContexto({ x: e.pageX, y: e.pageY, item })
  }

  function acaoEquipar(item: ItemDaBag) {
    if (ehConsumivel(item)) return
    despachar({ tipo: 'equipar', itemId: item.id })
  }

  function acaoDesequipar(item: ItemDaBag) {
    if (ehConsumivel(item)) return
    despachar({ tipo: 'desequipar', itemId: item.id })
  }

  const equipamentos = estado.personagem?.equipamentos ?? {}
  const equipados = estado.personagem?.itensEquipados ?? []

  return (
    <div className="bag" ref={ref} role="dialog" aria-label="Bag">
      <div className="bag__equipamentos">
        <div className="bag__titulo">Equipamentos</div>
        <div className="bag__slots">
          {Object.entries(SLOT_LABELS).map(([slot, label]) => {
            const id = equipamentos[slot as keyof typeof equipamentos]
            const item = id ? buscarItem(id) : undefined
            return (
              <div key={slot} className="bag__slot" title={label}>
                <div className="bag__slotLabel">{label}</div>
                <div className="bag__slotItem" onContextMenu={(e) => { if (item) onContextMenu(e, item) }}>
                  {item?.nome ?? '-'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bag__itens">
        <div className="bag__titulo">Inventário</div>
        <ul className="bag__lista">
          {estado.bag.map((item, idx) => {
            const equipado = equipados.includes(item.id)
            return (
              <li key={item.id + idx} className={equipado ? 'bag__linha equipada' : 'bag__linha'} onContextMenu={(e) => onContextMenu(e, item)}>
                <span>{item.nome}{ehConsumivel(item) ? ' (consumível)' : ''}</span>
                {equipado && <span className="bag__tag">Equipado</span>}
              </li>
            )
          })}
        </ul>
      </div>

      {contexto && (
        <div className="bag__contexto" style={{ left: contexto.x, top: contexto.y }}>
          <button className="bag__ctxItem" onClick={() => acaoEquipar(contexto.item)}>Equipar</button>
          <button className="bag__ctxItem" onClick={() => acaoDesequipar(contexto.item)}>Desequipar</button>
        </div>
      )}
    </div>
  )
}