import { useRef, useState } from 'react'
import { PONTOS_INICIAIS, derivados } from '../game/atributos'
import type { AcaoJogo, EstadoJogo } from '../game/estado'
import type { Classe, PontosAtributo, Raca } from '../game/tipos'

// Tela de criação. Ela só monta a tela e despacha intenção: os derivados e a
// regra dos 12 pontos vêm de `game/atributos.ts`, senão a tela e a regra iam
// divergir na primeira mudança de fórmula.

// Raça e classe não dão bônus no protótipo: a spec deixa a especialização para
// depois, e o que muda o personagem são os 12 pontos. O texto diz isso em vez de
// prometer uma diferença que o jogo não faz.
const RACAS: readonly { id: Raca; nome: string; nota: string }[] = [
  { id: 'humano', nome: 'Humano', nota: 'Sem bônus no protótipo.' },
  { id: 'elfo', nome: 'Elfo', nota: 'Sem bônus no protótipo.' },
  { id: 'anao', nome: 'Anão', nota: 'Sem bônus no protótipo.' },
]

const CLASSES: readonly { id: Classe; nome: string; nota: string }[] = [
  { id: 'cavaleiro', nome: 'Cavaleiro', nota: ' especialização prevista: Paladino e Guarda Real.' },
  { id: 'arqueiro', nome: 'Arqueiro', nota: ' especialização prevista: Caçador e Bardo.' },
  { id: 'mago', nome: 'Mago', nota: ' especialização prevista: Arquimago e Necromante.' },
]

const ATRIBUTOS: readonly { id: keyof PontosAtributo; nome: string; derivado: string }[] = [
  { id: 'forca', nome: 'Força', derivado: 'Ataque físico' },
  { id: 'agilidade', nome: 'Agilidade', derivado: 'Ataque à distância' },
  { id: 'inteligencia', nome: 'Inteligência', derivado: 'Dano mágico' },
]

export function CriacaoPersonagem({
  estado,
  despachar,
}: {
  estado: Readonly<EstadoJogo>
  despachar: (acao: AcaoJogo) => void
}) {
  const [nome, setNome] = useState('Herói')
  const [raca, setRaca] = useState<Raca>('humano')
  const [classe, setClasse] = useState<Classe>('cavaleiro')
  const criado = useRef(false)

  const pontos = estado.personagem?.pontos ?? { forca: 0, agilidade: 0, inteligencia: 0 }
  const livres = estado.personagem?.pontosLivres ?? PONTOS_INICIAIS
  const d = derivados(pontos)

  // O personagem precisa existir no jogo para receber ponto, e ele nasce pelo
  // reducer. O `criarPersonagem` recomeça o estado do zero, então isto só pode
  // rodar uma vez: rodar de novo apagaria os pontos já distribuídos.
  function criarSeFaltar(): void {
    if (criado.current) return
    criado.current = true
    despachar({ tipo: 'criarPersonagem', nome, raca, classe })
  }

  function confirmar(): void {
    criarSeFaltar()
    despachar({ tipo: 'avancarMissao' })
  }

  return (
    <section className="criacao">
      <h1>Endless</h1>
      <p className="criacao__frase">Você vai renascer. Escolha quem você é nesta vida.</p>

      <label className="campo">
        Nome
        <input value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} />
      </label>

      <fieldset>
        <legend>Raça</legend>
        {RACAS.map((r) => (
          <label key={r.id} className={raca === r.id ? 'opcao opcao--ativa' : 'opcao'}>
            <input type="radio" name="raca" checked={raca === r.id} onChange={() => setRaca(r.id)} />
            <strong>{r.nome}</strong>
            <span>{r.nota}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Classe</legend>
        {CLASSES.map((c) => (
          <label key={c.id} className={classe === c.id ? 'opcao opcao--ativa' : 'opcao'}>
            <input type="radio" name="classe" checked={classe === c.id} onChange={() => setClasse(c.id)} />
            <strong>{c.nome}</strong>
            <span>{c.nota}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Atributos, restam {livres} de {PONTOS_INICIAIS}</legend>
        {ATRIBUTOS.map((a) => (
          <div key={a.id} className="ponto">
            <button
              type="button"
              disabled={livres <= 0}
              onClick={() => {
                criarSeFaltar()
                despachar({ tipo: 'distribuirPonto', atributo: a.id })
              }}
            >
              {a.nome}: {pontos[a.id]}
            </button>
            <span>
              {a.derivado} {derivadoDe(a.id, d)}
            </span>
          </div>
        ))}
      </fieldset>

      <p className="criacao__resumo">
        Vida {d.vidaMaxima}, ataque físico {d.ataqueFisico}, ataque à distância {d.ataqueDistancia},
        dano mágico {d.danoMagico}, mana {d.manaMaxima}, movimento{' '}
        {d.velocidadeMovimento.toFixed(1)} tiles por segundo.
      </p>

      <button type="button" className="principal" onClick={confirmar}>
        Começar a jornada
      </button>
    </section>
  )
}

function derivadoDe(
  atributo: keyof PontosAtributo,
  d: ReturnType<typeof derivados>,
): number {
  if (atributo === 'forca') return d.ataqueFisico
  if (atributo === 'agilidade') return d.ataqueDistancia
  return d.danoMagico
}
