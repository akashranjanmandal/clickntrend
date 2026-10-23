import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HeroContent } from '../types';

interface HeroSectionProps {
  heroes: HeroContent[];
  autoplay?: boolean;
  interval?: number;
  /** Called once, when the first slide's media can be shown (or failed to load) */
  onReady?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  heroes,
  autoplay = true,
  interval = 5000,
  onReady,
}) => {
  const readySent = useRef(false);
  const markReady = () => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const currentHero = heroes[currentIndex] || heroes[0];

  useEffect(() => {
    if (heroes.length === 0) return;

    if (isPlaying) {
      timeoutRef.current = setTimeout(() => {
        nextSlide();
      }, interval);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, isPlaying, heroes.length]);

  useEffect(() => {
    if (videoRef.current) {
      if (currentHero?.media_type === 'video') {
        videoRef.current.load();
        setIsVideoLoaded(false);
      }
    }
  }, [currentIndex]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % heroes.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + heroes.length) % heroes.length);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  if (heroes.length === 0) {
    return null;
  }

  const align = currentHero.content_alignment || 'left';
  const textAlign = align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const boxPosition = align === 'right' ? 'ml-auto' : align === 'center' ? 'mx-auto' : '';
  const shade = align === 'right'
    ? 'bg-gradient-to-l from-black/80 via-black/45 to-black/5'
    : align === 'center'
    ? 'bg-black/45'
    : 'bg-gradient-to-r from-black/80 via-black/45 to-black/5';

  // Everything below comes from the Hero admin (hero_content). Nothing is filled in by the code:
  // a field left empty in admin simply isn't shown. *word* renders as a gold italic accent.
  const withAccent = (text: string) =>
    text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith('*') && part.endsWith('*') && part.length > 2
        ? <em key={i} className="font-serif italic font-normal text-gold-light">{part.slice(1, -1)}</em>
        : <React.Fragment key={i}>{part}</React.Fragment>
    );
  const title = (currentHero.title || '').trim();
  const subtitle = (currentHero.subtitle || '').trim();
  const eyebrow = (currentHero.eyebrow || '').trim();
  const highlights = (currentHero.highlights || []).map(h => h.trim()).filter(Boolean);

  // Links to this site (https://gftd.in/...) become in-app routes; others open normally
  const toHref = (link?: string) => (link || '').trim().replace(/^https?:\/\/(www\.)?gftd\.in/i, '') || '/';
  const primary = currentHero.cta_text?.trim() && currentHero.cta_link?.trim()
    ? { text: currentHero.cta_text.trim(), href: toHref(currentHero.cta_link) } : null;
  const secondary = currentHero.secondary_cta_text?.trim() && currentHero.secondary_cta_link?.trim()
    ? { text: currentHero.secondary_cta_text.trim(), href: toHref(currentHero.secondary_cta_link) } : null;

  const ctaClass = 'group inline-flex items-center gap-3 rounded-full bg-white py-3.5 pl-7 pr-2 text-sm font-medium text-premium-charcoal transition-all duration-300 hover:bg-gold-light';
  const secondaryClass = 'border-b border-white/40 pb-0.5 text-sm font-medium text-white/90 transition-colors hover:border-white hover:text-white';
  const heroLink = (href: string, className: string, children: React.ReactNode) =>
    href.startsWith('/') ? <Link to={href} className={className}>{children}</Link> : <a href={href} className={className}>{children}</a>;

  const reveal = {
    hidden: { opacity: 0, y: 28 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.2 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] } }),
  };

  return (
    <section
      aria-label="Featured"
      // Height grows with the content (never a fixed box), so text can't spill under the navbar on short screens
      className="relative flex min-h-[78svh] flex-col overflow-hidden bg-[#0d0c0a] md:min-h-[86vh]"
    >
      {/* Background media with a slow push-in */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1 }}
          className="absolute inset-0"
        >
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1.02 }}
            transition={{ duration: 10, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            {currentHero.media_type === 'video' ? (
              <video
                ref={videoRef}
                src={currentHero.media_url}
                poster={currentHero.video_poster_url}
                autoPlay={currentHero.autoplay}
                loop={currentHero.loop}
                muted={currentHero.muted}
                playsInline
                preload="auto"
                onLoadedData={() => { setIsVideoLoaded(true); markReady(); }}
                onError={markReady}
                className={`h-full w-full object-cover transition-opacity duration-700 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <img
                src={currentHero.media_url}
                alt={title || 'GFTD'}
                className="h-full w-full object-cover"
                fetchPriority="high"
                onLoad={markReady}
                onError={markReady}
              />
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Shading: readable text side, dark top for the navbar, deep bottom for the search bar */}
      <div className={`pointer-events-none absolute inset-0 ${shade}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      {/* Fine film grain for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />

      {/* Content: top padding clears the navbar (72/84px), bottom padding clears the overlapping search bar */}
      <div className="relative z-10 flex flex-1 items-end pb-28 pt-28 sm:pb-36 md:pb-40 md:pt-36">
        <div className="container mx-auto px-5 md:px-6">
          <div key={currentIndex} className={`flex max-w-[44rem] flex-col ${textAlign} ${boxPosition}`}>
            {eyebrow && (
              <motion.p
                custom={0} variants={reveal} initial="hidden" animate="show"
                className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]"
              >
                <span className="h-px w-10 bg-gold" />
                {eyebrow}
              </motion.p>
            )}

            {title && (
            <motion.h1
              custom={1} variants={reveal} initial="hidden" animate="show"
              className="font-serif font-light leading-[0.98] tracking-[-0.02em] text-white"
              // Scales with width *and* height, so short laptop screens get a smaller headline
              style={{ fontSize: 'clamp(2.5rem, min(6.6vw, 10.5vh), 5.75rem)', textWrap: 'balance' } as React.CSSProperties}
            >
              {withAccent(title)}
            </motion.h1>
            )}

            {subtitle && (
              <motion.p
                custom={2} variants={reveal} initial="hidden" animate="show"
                className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75 sm:text-base"
              >
                {subtitle}
              </motion.p>
            )}

            {(primary || secondary) && (
              <motion.div
                custom={3} variants={reveal} initial="hidden" animate="show"
                className={`mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}
              >
                {primary && heroLink(primary.href, ctaClass, <>
                  {primary.text}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-premium-charcoal text-white transition-transform duration-300 group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </>)}
                {secondary && heroLink(secondary.href, secondaryClass, secondary.text)}
              </motion.div>
            )}

            {highlights.length > 0 && (
            <motion.ul
              custom={4} variants={reveal} initial="hidden" animate="show"
              className="mt-10 hidden items-center gap-6 text-xs text-white/60 md:flex [@media(max-height:780px)]:mt-7 [@media(max-height:720px)]:hidden"
            >
              {highlights.map(point => (
                <li key={point} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-gold-light" />
                  {point}
                </li>
              ))}
            </motion.ul>
            )}
          </div>
        </div>
      </div>

      {/* Video controls + slide indicators (above the search bar) */}
      <div className="absolute bottom-24 right-5 z-20 flex items-center gap-2 sm:bottom-32 md:bottom-36 md:right-6">
        {heroes.length > 1 && (
          <div className="mr-2 flex gap-1.5">
            {heroes.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-[3px] rounded-full transition-all duration-500 ${index === currentIndex ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        )}
        {heroes.length > 1 && (
          <>
            <button onClick={prevSlide} aria-label="Previous slide" className="hidden rounded-full border border-white/20 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white md:block">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={nextSlide} aria-label="Next slide" className="hidden rounded-full border border-white/20 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white md:block">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
        {currentHero.media_type === 'video' && (
          <>
            <button onClick={togglePlay} aria-label={isPlaying ? 'Pause video' : 'Play video'} className="rounded-full border border-white/20 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={toggleMute} aria-label={isMuted ? 'Unmute video' : 'Mute video'} className="rounded-full border border-white/20 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default HeroSection;