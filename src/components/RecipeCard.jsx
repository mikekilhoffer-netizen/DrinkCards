export default function RecipeCard({ recipe }) {
  const { name, glass, method, photo_path, note, ingredients = [], garnishes = [] } = recipe

  return (
    <div className="card-wrapper">
      <div className="recipe-card">

        {/* Black header bar with drink name */}
        <div className="card-header">
          <span className="card-title">{name}</span>
        </div>

        {/* Two-column body */}
        <div className="card-body">

          {/* Left column: photo + glass + method */}
          <div className="card-left">
            <div className="card-photo">
              {photo_path ? (
                <img src={`file://${photo_path}`} alt={name} />
              ) : (
                <div className="card-no-photo">No photo</div>
              )}
            </div>
            <div className="card-glass-method">
              <div className="card-label">GLASS</div>
              <div className="card-value">{glass || '\u2014'}</div>
              <div className="card-label">METHOD</div>
              <div className="card-value">{method || '\u2014'}</div>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="card-divider" />

          {/* Right column: ingredients + garnishes + note */}
          <div className="card-right">
            {ingredients.length > 0 && (
              <div className="card-section">
                <div className="card-section-label">INGREDIENTS</div>
                {ingredients.map((item, i) => (
                  <div key={i} className="card-item-row">
                    <span className="card-amount">{item.amount}</span>
                    <span className="card-unit">{item.unit}</span>
                    <span className="card-name">{item.name}</span>
                  </div>
                ))}
              </div>
            )}

            {garnishes.length > 0 && (
              <div className="card-section">
                <div className="card-section-label">GARNISHES</div>
                {garnishes.map((item, i) => (
                  <div key={i} className="card-item-row">
                    <span className="card-amount">{item.amount}</span>
                    <span className="card-unit">{item.unit}</span>
                    <span className="card-name">{item.name}</span>
                  </div>
                ))}
              </div>
            )}

            {note && <div className="card-note">{note}</div>}
          </div>

        </div>
      </div>
    </div>
  )
}
