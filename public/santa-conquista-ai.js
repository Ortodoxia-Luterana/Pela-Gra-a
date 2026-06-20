(function initSantaConquistaAiNotes(root) {
  root.SantaConquistaAi = {
    posture(nation, state) {
      if (!nation) return 'Aguardando conselho.';
      const wars = state.wars.filter(war => war.status === 'active' && (war.attacker === nation.id || war.defender === nation.id));
      if (wars.length) return 'Em guerra: deve defender capital, buscar paz se perder e ocupar fronteiras fracas.';
      if (nation.resources?.stability < 45) return 'Instavel: tende a construir, reprimir revoltas e evitar guerra.';
      if (nation.resources?.gold > 140) return 'Prospera: tende a investir em mercado, muralhas e tropas.';
      return 'Cautelosa: observa vizinhos, reforca fronteiras e espera oportunidade.';
    }
  };
})(window);
