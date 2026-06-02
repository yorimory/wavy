import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function PricingPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl">
      <h2 className="text-3xl font-black text-on-surface tracking-tight mb-2">Тарифы WAVY CRM</h2>
      <p className="text-on-surface-variant mb-10">Freemium: базовый кабинет бесплатно, расширения — в Premium.</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-8 rounded-[32px] bg-white border border-outline-variant/30 shadow-sm flex flex-col">
          <h3 className="text-2xl font-black text-primary mb-2">Free</h3>
          <p className="text-on-surface-variant text-sm mb-6 flex-1">До 15 клиентов, записи, календарь, история карточек.</p>
          <ul className="text-sm space-y-2 mb-8 text-on-surface">
            <li>Клиенты и записи</li>
            <li>Календарь</li>
            <li className="text-on-surface-variant">Без Smart Retention и модерации AI</li>
          </ul>
          <div className="text-xs text-on-surface-variant">Текущий: {user?.subscription_tier === "premium" ? "у вас Premium" : "у вас Free"}</div>
        </div>

        <div className="p-8 rounded-[32px] primary-gradient text-white shadow-xl flex flex-col">
          <h3 className="text-2xl font-black mb-2">Premium</h3>
          <p className="text-primary-fixed text-sm mb-2 font-bold">9.99 BYN / мес (в прототипе — переключение в настройках DEV)</p>
          <ul className="text-sm space-y-2 mb-8 opacity-95">
            <li>Smart Retention — рекомендации по возврату клиентов</li>
            <li>Модерация текста отзывов и заметок</li>
            <li>Интеграции (заглушки в API)</li>
          </ul>
          <Link
            to="/settings"
            className="inline-flex justify-center px-6 py-4 rounded-full bg-white text-primary font-black hover:bg-primary-fixed transition-colors"
          >
            Управление тарифом (DEV)
          </Link>
        </div>
      </div>
    </div>
  );
}
