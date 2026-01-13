import Link from "next/link";
import { FC } from "react";

const Hero: FC = () => {
    return (
        <section className="relative min-h-screen pt-32 pb-20 overflow-hidden bg-white flex items-center border-b-2 border-black">

            {/* Decorative Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">

                {/* Left Column: Text */}
                <div className="max-w-2xl">
                    <div className="inline-block px-4 py-2 bg-[var(--color-brand-magenta)] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 transform -rotate-2">
                        <span className="text-white font-bold uppercase tracking-wider">Premium Printing Services</span>
                    </div>

                    <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-none mb-6 text-black drop-shadow-sm">
                        BRING YOUR <br />
                        <span className="text-white bg-[var(--color-brand-blue)] px-2 inline-block transform rotate-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">IDEAS</span> <br />
                        TO LIFE.
                    </h1>

                    <p className="text-lg font-bold text-black/80 mb-8 leading-relaxed max-w-lg">
                        High-quality custom printing. No boring stuff allowed. We make you look <span className="underline decoration-[var(--color-brand-yellow)] decoration-4 underline-offset-4">awesome</span>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-black text-white bg-[var(--color-brand-blue)] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            START CREATING
                        </Link>
                        <Link
                            href="/catalog"
                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-black text-black bg-[var(--color-brand-yellow)] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            GET A QUOTE
                        </Link>
                    </div>

                    <div className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center overflow-hidden z-10">
                                    <div className={`w-full h-full bg-gray-200`}></div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white border-2 border-black px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -ml-6 z-20 rotate-2">
                            <span className="font-bold text-sm">Trusted by 500+ Legends</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Visuals */}
                <div className="relative h-[600px] hidden lg:block">
                    {/* Card 1: T-Shirt */}
                    <div className="absolute top-10 right-10 w-72 h-80 bg-[var(--color-brand-yellow)] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-3 hover:rotate-0 transition-all duration-300 z-10">
                        <div className="w-full h-full bg-white border-2 border-black flex items-center justify-center relative overflow-hidden">
                            <span className="text-4xl font-black opacity-10 absolute -right-4 -bottom-4 rotate-[-45deg] scale-150">SHIRT</span>
                            <div className="text-center">
                                <p className="font-black text-xl">CUSTOM TEES</p>
                                <p className="font-bold bg-black text-white px-2 mt-1">₱150.00</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Business Card */}
                    <div className="absolute top-[40%] left-0 w-80 h-56 bg-[var(--color-brand-magenta)] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-4 transform -rotate-6 hover:rotate-0 transition-all duration-300 z-20">
                        <div className="w-full h-full bg-white border-2 border-black p-4 flex flex-col justify-between">
                            <div className="w-10 h-10 rounded-full bg-black"></div>
                            <div className="space-y-2">
                                <div className="w-3/4 h-3 bg-black"></div>
                                <div className="w-1/2 h-3 bg-black/50"></div>
                            </div>
                        </div>
                        <div className="absolute -top-6 -right-6 bg-white border-2 border-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-12">
                            <span className="font-bold text-xs uppercase">Biz Cards</span>
                        </div>
                    </div>

                    {/* Small Element */}
                    <div className="absolute bottom-20 right-32 w-24 h-24 bg-[var(--color-brand-cyan)] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transform rotate-12 z-30 rounded-full">
                        <span className="text-3xl">🔥</span>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default Hero;
