import { useRef, useState, useEffect } from 'react'

export default function Home() {
  const [fileName, setFileName] = useState('')
  const [imgUrl, setImgUrl] = useState(null) // object URL
  const canvasRef = useRef(null)
  const prevUrlRef = useRef(null)

  // filter state (numbers)
  const [preset, setPreset] = useState('none')
  const [brightness, setBrightness] = useState(1)
  const [contrast, setContrast] = useState(1)
  const [saturate, setSaturate] = useState(1)

  // cleanup object URL when component unmounts
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current)
        prevUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!imgUrl) {
      // clear canvas when no image
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx && ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = imgUrl

    const draw = () => {
      const maxW = 900
      const ratio = Math.min(1, maxW / image.width)
      canvas.width = Math.round(image.width * ratio)
      canvas.height = Math.round(image.height * ratio)

      // build filter string using numeric states
      const b = Number(brightness)
      const c = Number(contrast)
      const s = Number(saturate)
      let f = `brightness(${b}) contrast(${c}) saturate(${s})`
      if (preset === 'vintage') f += ' sepia(0.35)'
      if (preset === 'noir') f += ' grayscale(1) contrast(1.2)'
      if (preset === 'cold') f += ' hue-rotate(200deg) saturate(0.9)'

      if ('filter' in ctx) {
        ctx.filter = f
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        ctx.filter = 'none'
      } else {
        // fallback
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      }
    }

    image.onload = () => {
      try { draw() } catch (e) { console.error('draw error', e) }
    }

    image.onerror = (e) => {
      console.error('Image load error', e)
    }

    // إذا تغيّر أي من قيم الفلاتر نعيد الرسم (مش نحتاج تغيير الـ image.src)
    // لكن useEffect سيعاد تنفيذه عند تغير preset/brightness/contrast/saturate بفضل الديبندنسي أدناه.
    return () => {
      // لا حاجة لمسح شيء هنا بخصوص الصورة نفسها (نمسح الـ object URL في handleFile أو على unmount)
    }
  }, [imgUrl, preset, brightness, contrast, saturate])

  function handleFile(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    // revoke previous url
    if (prevUrlRef.current) {
      try { URL.revokeObjectURL(prevUrlRef.current) } catch (err) {}
      prevUrlRef.current = null
    }
    const url = URL.createObjectURL(f)
    prevUrlRef.current = url
    setFileName(f.name || 'edited.png')
    setImgUrl(url)
  }

  async function handleSend() {
    if (!canvasRef.current) return alert('اختار صورة الأول')
    const dataUrl = canvasRef.current.toDataURL('image/png')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, filename: fileName || 'edited.png' })
      })
      const json = await res.json()
      if (res.ok) {
        alert('تم الإرسال — راجع بريدك')
      } else {
        alert('حصل خطأ: ' + (json.error || 'unknown'))
      }
    } catch (err) {
      alert('خطأ في الشبكة: ' + err.message)
    }
  }

  function handleReset() {
    setPreset('none')
    setBrightness(1)
    setContrast(1)
    setSaturate(1)
  }

  function handleDownload() {
    if (!canvasRef.current) return alert('مافيش صورة تحملها')
    const link = document.createElement('a')
    link.href = canvasRef.current.toDataURL('image/png')
    link.download = fileName || 'edited.png'
    link.click()
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">ImageLab — محرر الصور</h1>
          <div className="text-sm text-gray-500">مودرن · فلاتر جاهزة · إرسال عبر الإيميل</div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="border rounded-lg p-4">
              <div className="mb-4 flex gap-3 items-center">
                <input onChange={handleFile} type="file" accept="image/*" />
                <button
                  onClick={handleReset}
                  className="px-3 py-1 bg-gray-100 rounded"
                >
                  Reset
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 bg-green-100 rounded"
                >
                  Download
                </button>
              </div>

              <div className="w-full h-auto flex justify-center overflow-hidden">
                <canvas ref={canvasRef} className="max-w-full rounded shadow-inner" />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={() => setPreset('vintage')} className="px-3 py-2 bg-amber-100 rounded">Vintage</button>
              <button onClick={() => setPreset('noir')} className="px-3 py-2 bg-gray-800 text-white rounded">Noir</button>
              <button onClick={() => setPreset('cold')} className="px-3 py-2 bg-blue-100 rounded">Cold</button>
              <button onClick={() => setPreset('none')} className="px-3 py-2 bg-green-100 rounded">Original</button>
            </div>
          </div>

          <aside className="p-4 border rounded-lg">
            <h3 className="font-medium mb-2">Adjustments</h3>

            <label className="block text-sm mb-1">Brightness: {Number(brightness).toFixed(2)}</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.01"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
            />

            <label className="block text-sm mt-3 mb-1">Contrast: {Number(contrast).toFixed(2)}</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.01"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
            />

            <label className="block text-sm mt-3 mb-1">Saturate: {Number(saturate).toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={saturate}
              onChange={(e) => setSaturate(Number(e.target.value))}
            />

            <div className="mt-4">
              <button onClick={handleSend} className="w-full px-4 py-2 bg-indigo-600 text-white rounded">Send by Email</button>
            </div>
          </aside>
        </div>

        <footer className="mt-6 text-xs text-gray-500">Designed for deployment on Vercel — uses server API to forward images via Nodemailer.</footer>
      </div>
    </div>
  )
}
