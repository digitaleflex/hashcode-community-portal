'use client'

import { useState, useRef } from 'react'
import { File, Upload, CheckCircle, Loader2, X } from 'lucide-react'
import type { ColumnMapping } from '@/lib/import-excel'

type ImportResult = {
  success: boolean
  createdCount?: number
  updatedCount?: number
  errors?: Array<{ row: number; message: string }>
  error?: string
}

type PreviewData = {
  headers: string[]
  rows: Record<string, unknown>[]
}

const MAPPING_FIELDS: Array<{ key: keyof ColumnMapping; label: string }> = [
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'country', label: 'Pays' },
  { key: 'status', label: 'Statut' },
  { key: 'gender', label: 'Genre' },
]

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError(null)
    setResult(null)
    setPreview(null)
    setMapping({})
  }

  // Step 1: Upload file → get column headers
  const handleUploadForPreview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setError('Veuillez sélectionner un fichier.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json().catch(() => ({
        success: false,
        error: 'Réponse serveur invalide',
      }))

      if (!res.ok || !data.success) {
        setError(data.error || `Erreur ${res.status}`)
        return
      }

      // Auto-detect column mappings based on header names
      const autoMapping: ColumnMapping = {}
      for (const field of MAPPING_FIELDS) {
        const candidates = {
          email: ['email', 'e-mail', 'courriel'],
          firstName: ['prénom', 'firstname', 'first_name', 'prenom'],
          lastName: ['nom', 'lastname', 'last_name', 'name'],
          country: ['pays', 'country', 'country_code'],
          status: ['status'],
          gender: ['genre', 'gender', 'sexe'],
        }
        const lower = data.preview.headers.map((h: string) => h.toLowerCase())
        for (const candidate of candidates[field.key] || []) {
          const idx = lower.indexOf(candidate)
          if (idx >= 0) {
            autoMapping[field.key] = data.preview.headers[idx]
            break
          }
        }
      }
      setMapping(autoMapping)
      setPreview(data.preview)
    } catch (err) {
      setError('Erreur réseau lors de l\'envoi du fichier.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Submit with column mapping → run import
  const handleSubmitWithMapping = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mapping', JSON.stringify(mapping))

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data: ImportResult = await res.json().catch(() => ({
        success: false,
        error: 'Réponse serveur invalide',
      }))

      if (!res.ok) {
        setError(data.error || `Erreur ${res.status}`)
        return
      }

      setResult(data)
      setPreview(null)
      setMapping({})
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError('Erreur réseau lors de l\'envoi du fichier.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setError(null)
    setResult(null)
    setPreview(null)
    setMapping({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const mappingOptions = preview
    ? [
        { value: '', label: '— Ne pas importer —' },
        ...preview.headers.map((h: string) => ({ value: h, label: h })),
      ]
    : []

  return (
    <main className="admin">
      <div className="admin-wrap">
        <div className="admin-heading">
          <h1>Import Excel/CSV</h1>
          <p>Importez des membres par fichier Excel ou CSV</p>
        </div>

        {!preview && !result && (
          <form onSubmit={handleUploadForPreview}>
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                margin: '32px 0',
              }}
            >
              <File size={48} style={{ color: 'var(--muted-foreground)', marginBottom: 16 }} />
              <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 16 }}>
                Formats supportés : .xlsx, .xls, .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {file ? 'Changer de fichier' : 'Parcourir'}
              </button>
              {file && (
                <p style={{ marginTop: 16, fontSize: 14 }}>
                  Fichier sélectionné : <strong>{file.name}</strong>
                </p>
              )}
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--danger-light, #fee2e2)',
                  border: '1px solid var(--danger, #f87171)',
                  borderRadius: 6,
                  padding: 16,
                  marginBottom: 24,
                  color: 'var(--danger, #f87171)',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={!file || loading}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: !file || loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  opacity: !file || loading ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Envoyer
                  </>
                )}
              </button>
              {file && !loading && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: 'var(--muted-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <X size={16} />
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}

        {/* Step 2: Column mapping form */}
        {preview && !result && (
          <div>
            {file && (
              <p style={{ marginBottom: 16, fontSize: 14, color: 'var(--muted-foreground)' }}>
                Fichier : <strong>{file.name}</strong>
              </p>
            )}

            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
                Correspondance des colonnes
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 20 }}>
                Mappez chaque champ à la colonne Excel correspondante. Laissez vide pour ne pas importer.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {MAPPING_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 16 }}
                  >
                    <label
                      htmlFor={`mapping-${field.key}`}
                      style={{ fontSize: 14, fontWeight: 500 }}
                    >
                      {field.label}
                    </label>
                    <select
                      id={`mapping-${field.key}`}
                      value={mapping[field.key] ?? ''}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: 14,
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      {mappingOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              {preview.rows.length > 0 && (
                <div style={{ marginTop: 24, overflowX: 'auto' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--muted-foreground)' }}>
                    Aperçu ({preview.rows.length} ligne{preview.rows.length > 1 ? 's' : ''})
                  </p>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: 13,
                      minWidth: 600,
                    }}
                  >
                    <thead>
                      <tr>
                        {preview.headers.map((h: string) => (
                          <th
                            key={h}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              padding: '6px 10px',
                              textAlign: 'left',
                              color: 'var(--muted-foreground)',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row: Record<string, unknown>, idx: number) => (
                        <tr key={idx}>
                          {preview.headers.map((h: string) => (
                            <td
                              key={h}
                              style={{
                                padding: '6px 10px',
                                borderBottom: '1px solid var(--border)',
                                whiteSpace: 'nowrap',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > 5 && (
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>
                      ... et {preview.rows.length - 5} ligne{preview.rows.length - 5 > 1 ? 's' : ''} supplémentaire{preview.rows.length - 5 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--danger-light, #fee2e2)',
                  border: '1px solid var(--danger, #f87171)',
                  borderRadius: 6,
                  padding: 16,
                  marginBottom: 24,
                  color: 'var(--danger, #f87171)',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleSubmitWithMapping}
                disabled={loading || !preview}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  opacity: loading ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Importer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <X size={16} />
                Annuler
              </button>
            </div>
          </div>
        )}

        {result && (
          <div style={{ marginTop: 32 }}>
            <div className="admin-heading">
              <h2>Résultat de l'import</h2>
            </div>

            {result.success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: 6,
                  marginBottom: 16,
                  color: '#166534',
                }}
              >
                <CheckCircle size={20} />
                <div>
                  <strong>Import terminé</strong>
                  <span style={{ marginLeft: 12 }}>
                    {result.createdCount ?? 0} créé(s) · {result.updatedCount ?? 0} mis à jour
                  </span>
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div
                style={{
                  background: 'var(--danger-light, #fee2e2)',
                  border: '1px solid var(--danger, #f87171)',
                  borderRadius: 6,
                  padding: 16,
                }}
              >
                <p
                  style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'var(--danger, #f87171)',
                  }}
                >
                  {result.errors.length} erreur(s)
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 16,
                    color: 'var(--danger, #f87171)',
                  }}
                >
                  {result.errors.map((e, i) => (
                    <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>
                      Ligne {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
