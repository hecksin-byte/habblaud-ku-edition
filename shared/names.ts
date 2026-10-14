import { hash32 } from './hash';

export interface PersonName {
  name: string;
  look: 'f' | 'm';
}

// Nomes coreanos de 20~30대 para os personagens (nada de nomes de gerações mais velhas, como "말숙" ou "익철").
// Sem duplicatas e sem variações quase iguais, para que cada personagem seja inconfundível no escritório.
// A ordem é a do antigo pool brasileiro (mesmo índice = mesma pessoa), que permitiu renomear quem já estava salvo.
const F = [
  '김서연', '이지우', '박하은', '최서윤', '정수빈', '강지민', '조유진', '윤채원', '장하윤', '임다은',
  '한소율', '오지유', '서예린', '신아린', '권나연', '황민지', '안지현', '송예은', '류시은', '홍지아',
  '김하늘', '이수아', '박다인', '최예나', '정은서', '강서현', '조민서', '윤세아', '장유나', '임지원',
  '한채은', '오하린', '서다현', '신유빈', '권소미', '황가은', '안보라', '송미소', '류하나', '홍채린',
  '김나은', '이도연', '박소현', '최아영', '정혜인', '강은채', '조하영', '윤서아', '장예서', '임가영',
  '한지수', '오수민', '서하윤', '신다솜', '권유리', '황소희', '안채윤', '송지안', '류아윤', '홍서진',
];
const M = [
  '김민준', '이서준', '박도윤', '최예준', '정시우', '강하준', '조주원', '윤지호', '장준서', '임건우',
  '한우진', '오지훈', '서현우', '신유찬', '권민재', '황선우', '안태윤', '송재원', '류승현', '홍도현',
  '김준영', '이성민', '박지환', '최동현', '정민호', '강태민', '조현준', '윤재민', '장시윤', '임예찬',
  '한규민', '오찬영', '서진우', '신지성', '권도훈', '황승우', '안정우', '송은우', '류하람', '홍재현',
  '김태훈', '이현우', '박상우', '최윤호', '정원재', '강의찬', '조민규', '윤성호', '장대현', '임현수',
  '한동윤', '오세훈', '서영민', '신재훈', '권해준', '황지훈', '안시현', '송민성', '류건호', '홍윤재',
];

export const NAME_POOL: readonly PersonName[] = Object.freeze(
  // Intercala para que nomes vizinhos no pool alternem a dica visual.
  F.flatMap((f, i) => [{ name: f, look: 'f' as const }, ...(M[i] ? [{ name: M[i], look: 'm' as const }] : [])]),
);

/**
 * Escolhe um nome determinístico para `id`, evitando os já usados.
 * Se o pool esgotar, acrescenta um sufixo numérico ("Ana 2").
 */
export function pickName(id: string, used: ReadonlySet<string>): PersonName {
  const n = NAME_POOL.length;
  const start = hash32(id) % n;
  for (let i = 0; i < n; i++) {
    const cand = NAME_POOL[(start + i) % n];
    if (!used.has(cand.name)) return cand;
  }
  const base = NAME_POOL[start];
  for (let k = 2; ; k++) {
    const name = `${base.name} ${k}`;
    if (!used.has(name)) return { name, look: base.look };
  }
}
