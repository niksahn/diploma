import { Link } from "react-router-dom";
import { ru } from "../shared/i18n/ru";

function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-gray-600 mb-6">{ru.notFound.pageNotFound}</p>
      <Link to="/" className="text-indigo-600 hover:underline">
        {ru.notFound.goHome}
      </Link>
    </div>
  );
}

export default NotFoundPage;
