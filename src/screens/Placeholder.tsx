// Temporary screen used until each real screen is built.
export default function Placeholder({ title, step }: { title: string; step: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">This screen is built in {step}.</p>
    </section>
  )
}
