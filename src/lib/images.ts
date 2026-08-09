/**
 * Central photo manifest.
 *
 * These are statically imported so Next.js derives intrinsic width/height and a
 * blur placeholder at build time — no layout shift, and a blur-up on load.
 * Swap the files in `src/images/` for your own brand photography; the keys and
 * aspect ratios are what the layouts depend on, not the specific shots.
 */

import agentWorking from "@/images/agent-working.jpg";
import citySkyline from "@/images/city-skyline.jpg";
import handshakeKeys from "@/images/handshake-keys.jpg";
import heroHome from "@/images/hero-home.jpg";
import kitchen from "@/images/kitchen.jpg";
import livingRoom from "@/images/living-room.jpg";
import luxuryExterior from "@/images/luxury-exterior.jpg";
import modernInterior from "@/images/modern-interior.jpg";
import neighborhood from "@/images/neighborhood.jpg";
import openHouse from "@/images/open-house.jpg";
import signing from "@/images/signing.jpg";
import suburbanStreet from "@/images/suburban-street.jpg";

import agent1 from "@/images/agent-1.jpg";
import agent2 from "@/images/agent-2.jpg";
import agent3 from "@/images/agent-3.jpg";
import agent4 from "@/images/agent-4.jpg";
import agent5 from "@/images/agent-5.jpg";
import agent6 from "@/images/agent-6.jpg";

export const PHOTOS = {
  heroHome,
  handshakeKeys,
  modernInterior,
  luxuryExterior,
  livingRoom,
  suburbanStreet,
  kitchen,
  agentWorking,
  citySkyline,
  openHouse,
  signing,
  neighborhood,
};

export const AGENT_PORTRAITS = [agent1, agent2, agent3, agent4, agent5, agent6];
