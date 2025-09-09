"use client";

import Link from 'next/link';
import { Dumbbell, MapPin, Phone, Mail, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/profile.php?id=100046609075249' },
    { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/animalfitcenter/' },
  ];
  
  const whatsappNumber = "5491121678134"; // Formato internacional sin símbolos
  const whatsappLink = `https://wa.me/${whatsappNumber}`;
  const googleMapsLink = "https://www.google.com/maps/search/?api=1&query=Eva+Duarte+de+Per%C3%B3n,+Grand+Bourg,+Argentina";

  return (
    <footer className="bg-card text-card-foreground border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* About Section */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center justify-center md:justify-start gap-2 text-primary hover:text-primary/80 transition-colors">
              <Dumbbell className="h-7 w-7" />
              <span className="text-xl font-bold">Animal GYM</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
             🔥 ¡Desata tu animal interior! | 💪🏻 Disciplinas & Musculación | ⚠️ ¡Unite al #teamanimal!
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Contacto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center justify-center md:justify-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  <span>Eva Duarte de Perón, Grand Bourg, Argentina</span>
                </a>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  11-2167-8134
                </a>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href="mailto:animalgymgb371@gmail.com" className="hover:text-primary">
                  animalgymgb371@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Síguenos</h3>
            {socialLinks.length > 0 ? (
                <div className="flex justify-center md:justify-start space-x-4">
                {socialLinks.map((social) => (
                    <a 
                      key={social.name} 
                      href={social.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-primary bg-secondary p-2 rounded-full transition-colors duration-300"
                    >
                      <social.icon className="h-6 w-6" />
                      <span className="sr-only">{social.name}</span>
                    </a>
                ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Próximamente en redes sociales.</p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Animal GYM. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}