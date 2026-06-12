import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "@/api/client";
import type { AppointmentOut, ReviewOut } from "@/types";

export function ReviewModal() {
  const location = useLocation();
  const [apptId, setApptId] = useState<number | null>(null);
  const [apptDetails, setApptDetails] = useState<AppointmentOut | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function checkPending() {
      try {
        const token = localStorage.getItem("wavy_access_token");
        if (!token) return;

        const pendingIds = await apiFetch<number[]>("/reviews/pending");
        if (!pendingIds || pendingIds.length === 0 || !alive) return;

        const skippedRaw = localStorage.getItem("wavy_skipped_reviews");
        const skippedIds: number[] = skippedRaw ? JSON.parse(skippedRaw) : [];
        const nextId = pendingIds.find((id) => !skippedIds.includes(id));

        if (nextId) {
          setApptId(nextId);
          const clientAppts = await apiFetch<AppointmentOut[]>("/appointments/client");
          if (!alive) return;
          const found = clientAppts.find((a) => a.id === nextId);
          if (found) {
            setApptDetails(found);
          }
        }
      } catch (e) {
        console.error("Failed to load pending reviews", e);
      }
    }

    void checkPending();

    // Poll every 20 seconds in case a booking is completed or time elapsed
    const interval = setInterval(() => {
      void checkPending();
    }, 20000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  if (!apptId || !apptDetails) return null;

  const handleSkip = () => {
    const skippedRaw = localStorage.getItem("wavy_skipped_reviews");
    const skippedIds: number[] = skippedRaw ? JSON.parse(skippedRaw) : [];
    skippedIds.push(apptId);
    localStorage.setItem("wavy_skipped_reviews", JSON.stringify(skippedIds));
    setApptId(null);
    setApptDetails(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch<ReviewOut>("/reviews", {
        method: "POST",
        body: JSON.stringify({
          appointment_id: apptId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      // Закрываем модальное окно при успехе
      setApptId(null);
      setApptDetails(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить отзыв");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50  animate-fade-in">
      <div className="w-full max-w-md p-6 bg-surface-container-lowest border border-outline-variant/20 rounded-[32px] shadow-elevated animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-on-surface tracking-tight">Как всё прошло?</h3>
          <button
            onClick={handleSkip}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-all"
            title="Отказаться от отзыва"
          >
            <span className="material-symbols-outlined block">close</span>
          </button>
        </div>

        <p className="text-sm text-on-surface-variant mb-6">
          Пожалуйста, поделитесь впечатлением о вашем визите к мастеру{" "}
          <strong className="text-primary">{apptDetails.provider_name || "Специалисту"}</strong> по услуге{" "}
          <strong className="text-on-surface">{apptDetails.service_title || "Процедура"}</strong>.
        </p>

        {error && (
          <div className="p-3 mb-4 text-xs font-bold text-error bg-error/10 border border-error/20 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <span className="section-label">Ваша оценка</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = hoverRating ? star <= hoverRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-all duration-150 hover:scale-125"
                  >
                    <span
                      className={`material-symbols-outlined text-4xl select-none transition-colors ${
                        active
                          ? rating <= 2
                            ? "text-error fill-1"
                            : rating === 3
                            ? "text-amber-500 fill-1"
                            : "text-amber-400 fill-1"
                          : "text-outline-variant"
                      }`}
                      style={{ fontVariationSettings: ` 'FILL' ${active ? 1 : 0}, 'wght' 400` }}
                    >
                      star
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-on-surface-variant">
              {rating === 1 && "Ужасно"}
              {rating === 2 && "Плохо"}
              {rating === 3 && "Нормально"}
              {rating === 4 && "Хорошо"}
              {rating === 5 && "Великолепно!"}
            </span>
          </div>

          <div className="space-y-2">
            <label className="section-label" htmlFor="review-comment">
              Ваш комментарий (необязательно)
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="input-field min-h-[100px] resize-none"
              placeholder="Расскажите, что вам понравилось или над чем стоит поработать..."
              maxLength={500}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 btn-secondary"
              disabled={isSubmitting}
            >
              Отказаться
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
