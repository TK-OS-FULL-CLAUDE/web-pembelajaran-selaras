// Tampilan dokumen perangkat ajar. Dipakai untuk pratinjau di tab Perangkat Ajar dan untuk dicetak/disimpan PDF.
// Gaya dokumen ada di globals.css (.dok …), termasuk aturan @media print.

import type { ReactNode } from "react";
import { filled } from "@/lib/perangkat";
import { RUBRIK_LEVELS, type KegiatanTahap, type Lkpd, type ModulAjar, type Rubrik } from "@/lib/types";

/** Judul dengan tingkat yang menyesuaikan tempatnya (h3 di dalam kartu, h1 saat dicetak). */
function H({ level, className, children }: { level: number; className: string; children: ReactNode }) {
  const Tag = `h${Math.min(6, Math.max(1, level))}` as "h2";
  return <Tag className={className}>{children}</Tag>;
}

export function DraftMark({ checked }: { checked: boolean }) {
  if (checked) return null;
  return <p className="dok-draf">Draf AI — wajib dicek guru</p>;
}

function Items({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const list = filled(items);
  if (!list.length) return <p className="dok-kosong">Belum diisi.</p>;
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag>
      {list.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </Tag>
  );
}

const IDENTITAS: [keyof ModulAjar["identitas"], string][] = [
  ["penyusun", "Penyusun"],
  ["sekolah", "Satuan pendidikan"],
  ["mapel", "Mata pelajaran"],
  ["kelas", "Kelas"],
  ["fase", "Fase"],
  ["topik", "Materi"],
  ["alokasi", "Alokasi waktu"],
];

export function ModulDoc({ data, checked, level = 1 }: { data: ModulAjar; checked: boolean; level?: number }) {
  const tahap: [string, KegiatanTahap][] = [
    ["Pendahuluan", data.pendahuluan],
    ["Kegiatan inti", data.inti],
    ["Penutup", data.penutup],
  ];
  const akomodasi = filled(data.akomodasi);
  return (
    <article className="dok">
      <DraftMark checked={checked} />
      <p className="dok-kecil">Modul Ajar</p>
      <H level={level} className="dok-judul">
        {data.identitas.topik || "Tanpa judul"}
      </H>
      <table className="dok-identitas">
        <caption className="sr-only">Identitas modul</caption>
        <tbody>
          {IDENTITAS.map(([key, label]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td>{data.identitas[key] || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H level={level + 1} className="dok-bagian">
        A. Tujuan pembelajaran
      </H>
      <Items items={data.tujuan} ordered />

      <H level={level + 1} className="dok-bagian">
        B. Media, alat, dan bahan
      </H>
      <Items items={data.sarana} />

      <H level={level + 1} className="dok-bagian">
        C. Kegiatan pembelajaran
      </H>
      {tahap.map(([label, t], i) => (
        <div key={label} className="dok-tahap">
          <H level={level + 2} className="dok-sub">
            {i + 1}. {label}
            {t.menit > 0 ? ` (${t.menit} menit)` : ""}
          </H>
          <Items items={t.langkah} ordered />
        </div>
      ))}

      <H level={level + 1} className="dok-bagian">
        D. Asesmen
      </H>
      <Items items={data.asesmen} />

      {akomodasi.length > 0 && (
        <>
          <H level={level + 1} className="dok-bagian">
            E. Akomodasi untuk kebutuhan kelas
          </H>
          <Items items={akomodasi} />
        </>
      )}
    </article>
  );
}

export function LkpdDoc({
  data,
  checked,
  simple = false,
  level = 1,
}: {
  data: Lkpd;
  checked: boolean;
  simple?: boolean;
  level?: number;
}) {
  const lines = simple ? 2 : 3;
  return (
    <article className={simple ? "dok dok-mudah" : "dok"}>
      <DraftMark checked={checked} />
      <p className="dok-kecil">Lembar Kerja Peserta Didik{simple ? " (versi sederhana)" : ""}</p>
      <H level={level} className="dok-judul">
        {data.judul || "LKPD"}
      </H>
      <div className="dok-isian">
        <span>Nama:</span>
        <span>Kelas:</span>
        <span>Tanggal:</span>
      </div>
      {data.tujuan.trim() && (
        <p>
          <strong>Tujuan:</strong> {data.tujuan.trim()}
        </p>
      )}
      {filled(data.petunjuk).length > 0 && (
        <>
          <H level={level + 1} className="dok-bagian">
            Petunjuk
          </H>
          <Items items={data.petunjuk} ordered />
        </>
      )}
      {data.aktivitas.map((a, i) => (
        <section key={i} className="dok-aktivitas">
          <H level={level + 1} className="dok-bagian">
            Aktivitas {i + 1}
            {a.judul.trim() && a.judul.trim() !== `Aktivitas ${i + 1}` ? `: ${a.judul.trim()}` : ""}
          </H>
          {filled(a.langkah).length > 0 && <Items items={a.langkah} ordered />}
          {filled(a.pertanyaan).length > 0 && (
            <>
              <p className="dok-label">{simple ? "Jawablah:" : "Jawablah pertanyaan berikut."}</p>
              <ol className="dok-soal">
                {filled(a.pertanyaan).map((q, j) => (
                  <li key={j}>
                    {q}
                    <div aria-hidden className="dok-jawab">
                      {Array.from({ length: lines }, (_, k) => (
                        <span key={k} className="dok-garis" />
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      ))}
    </article>
  );
}

export function RubrikDoc({ data, checked, level = 1 }: { data: Rubrik; checked: boolean; level?: number }) {
  const rows = data.kriteria.filter((k) => k.nama.trim() || k.level.some((l) => l.trim()));
  return (
    <article className="dok">
      <DraftMark checked={checked} />
      <p className="dok-kecil">Rubrik Penilaian</p>
      <H level={level} className="dok-judul">
        {data.judul || "Rubrik penilaian"}
      </H>
      <div className="dok-gulir" tabIndex={0} role="region" aria-label="Tabel rubrik (bisa digeser)">
        <table className="dok-tabel">
          <caption className="sr-only">Kriteria dan deskripsi empat tingkat capaian</caption>
          <thead>
            <tr>
              <th scope="col">Kriteria</th>
              {RUBRIK_LEVELS.map((l, i) => (
                <th key={l} scope="col">
                  {l} ({i + 1})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((k, i) => (
              <tr key={i}>
                <th scope="row">{k.nama || `Kriteria ${i + 1}`}</th>
                {RUBRIK_LEVELS.map((l, j) => (
                  <td key={l}>{k.level[j] || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <p className="dok-kecil dok-catatan">
          Skor tiap kriteria 1–4. Nilai akhir = jumlah skor ÷ {rows.length * 4} × 100.
        </p>
      )}
    </article>
  );
}
