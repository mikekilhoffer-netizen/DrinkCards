const DONATION_URL = 'https://buy.stripe.com/4gM4gA2si1ucaqLem4gA800'

export default function About({ onClose }) {
  const openDonation = () => {
    window.open(DONATION_URL, '_blank')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box about-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <div className="about-logo">
          <div className="about-logo-icon">&#127379;</div>
        </div>

        <h2 className="about-title">Drink Recipe Book Creator</h2>
        <p className="about-version">Version 1.0</p>

        <p className="about-body">
          Developed by <strong>Michael Kilhoffer</strong>.
        </p>
        <p className="about-body">
          A desktop app for building, organizing, and printing professional
          drink recipe cards — right from your own machine, no internet required.
        </p>

        <div className="about-divider" />

        <p className="about-support-label">Enjoying the app?</p>
        <p className="about-body">
          If this has saved you time or made your bar program a little easier,
          consider buying me a coffee. It helps keep the lights on!
        </p>

        <button className="btn about-donate-btn" onClick={openDonation}>
          &#9749; Buy Me a Coffee &mdash; $5
        </button>

        <button className="btn btn-secondary about-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
