import { BASE_CSS } from "@/lib/theme";

export const metadata = { title: "Aangan Studio: Enquiry desk", robots: { index: false, follow: false } };

export default function Home() {
  return (
    <main style={{ maxWidth: 560, paddingTop: 72 }}>
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
      <header className="top" style={{ justifyContent: "flex-start" }}>
        <div className="brand">
          <div className="mark">A</div>
          <div><b>Aangan Studio</b><span>Enquiry desk</span></div>
        </div>
      </header>
      <section className="hero calm">
        <h1>Welcome to the Aangan enquiry desk.</h1>
        <p>This page is private. Open it from the link the studio shared with you. It already contains your access key, so there is nothing to type. If you do not have the link, ask Nikhil.</p>
      </section>
      <footer>Aangan Studio · phone enquiries</footer>
    </main>
  );
}
