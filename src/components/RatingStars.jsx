import { useState } from 'react';

export default function RatingStars({ onRate, initialValue = 0, readonly = false }) {
  const [rating, setRating] = useState(initialValue);

  function rate(value) {
    if (readonly) return;
    setRating(value);
    onRate?.(value);
  }

  return (
    <div style={{ fontSize: '28px', lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            cursor: readonly ? 'default' : 'pointer',
            color: star <= rating ? '#facc15' : '#d1d5db',
            marginRight: '4px'
          }}
          onClick={() => rate(star)}
        >
          ★
        </span>
      ))}
    </div>
  );
}