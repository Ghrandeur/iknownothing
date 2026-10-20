import Image from "next/image";
import { siteImages } from "@/lib/site-content";

const moments = [
  { src: siteImages.queen, title: "A vision for tomorrow", type: "The women" },
  { src: siteImages.leadership, title: "Stronger, together", type: "Leadership" },
  { src: siteImages.mentorship, title: "The power of a guide", type: "Mentorship" },
  { src: siteImages.community, title: "Purpose in practice", type: "Community" },
  { src: siteImages.education, title: "A future in learning", type: "Education" },
  { src: siteImages.conversation, title: "Ideas become action", type: "The movement" },
  { src: siteImages.portrait, title: "Confidence without limits", type: "The women" },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-nlqi-cream pb-20 pt-32 sm:pb-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mb-12 flex flex-col justify-between gap-5 sm:mb-16 md:flex-row md:items-end">
          <div>
            <p className="editorial-label">The NLQI experience</p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.05] text-nlqi-green sm:text-7xl">
              Moments that
              <br />
              <span className="italic text-[#a58225]">move us.</span>
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-7 text-nlqi-charcoal/65">
            A glimpse of the people, purpose and possibility at the heart of the
            Nigeria Legacy Queen International journey.
          </p>
        </div>

        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
          {moments.map((moment, index) => (
            <figure
              key={moment.title}
              className={`group relative mb-5 break-inside-avoid overflow-hidden rounded-2xl bg-nlqi-green ${
                index % 3 === 0 ? "aspect-[4/5]" : index % 3 === 1 ? "aspect-[5/4]" : "aspect-[4/4]"
              }`}
            >
              <Image
                src={moment.src}
                alt={moment.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002d19]/85 via-transparent to-transparent opacity-75 transition-opacity group-hover:opacity-100" />
              <figcaption className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-nlqi-gold-light">
                  {moment.type}
                </p>
                <h2 className="mt-2 font-serif text-xl">{moment.title}</h2>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-center text-[10px] leading-5 text-nlqi-charcoal/45">
          Illustrative photography. Replace with NLQI programme images as they become available.
        </p>
      </div>
    </div>
  );
}
