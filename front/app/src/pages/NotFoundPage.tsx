import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="card">
        <h1 className="text-xl font-semibold text-slate-900">Страница не найдена</h1>
        <p className="text-sm text-slate-600 mt-2">Проверьте адрес или вернитесь на главную.</p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          На главную
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage





