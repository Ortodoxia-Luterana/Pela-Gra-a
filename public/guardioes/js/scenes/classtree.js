/* Caminho dos Guardioes - ClassTreeScene: classe atual e arvore de habilidades por ramo */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;
  const CLASS_POINTS_PER_LEVEL = 1;

  class ClassTreeScene extends Phaser.Scene {
    constructor() { super('ClassTree'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;

      this.add.rectangle(0, 0, width, height, 0x181410).setOrigin(0);
      UI.topBar(this, 'Classe & Árvore de Habilidades', () => this.scene.start('Menu'));

      this.classTabs = {};
      const tabY = 96;
      D.CLASS_ORDER.forEach((id, i) => {
        const x = width / 2 - 220 + i * 220;
        const isActive = state.profile.selectedClass === id;
        const btn = UI.makeButton(this, x, tabY, D.CLASSES[id].name, () => this.selectClass(id), { width: 200, height: 50, fontSize: 16 });
        btn.setAlpha(isActive ? 1 : 0.6);
        this.classTabs[id] = btn;
      });

      this.pointsText = this.add.text(width - 30, 26, '', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#f2e2b8'
      }).setOrigin(1, 0);

      this.treeContainer = this.add.container(0, 0);
      this.renderClass(state.profile.selectedClass);
    }

    classPoints() {
      const state = this.state;
      const total = (state.profile.level - 1) * CLASS_POINTS_PER_LEVEL;
      const spentTotal = D.CLASS_ORDER.reduce((s, id) => s + (state.profile.classes[id].spent || 0), 0);
      return Math.max(0, total - spentTotal);
    }

    selectClass(id) {
      this.state.profile.selectedClass = id;
      global.GuardioesSave.save(this.state);
      D.CLASS_ORDER.forEach(cid => this.classTabs[cid].setAlpha(cid === id ? 1 : 0.6));
      this.renderClass(id);
    }

    renderClass(classId) {
      this.treeContainer.removeAll(true);
      const { width, height } = this.scale;
      const cls = D.CLASSES[classId];
      const branches = Object.values(cls.branches);
      const colW = width / branches.length;

      this.pointsText.setText(`Pontos de Classe: ${this.classPoints()}`);

      branches.forEach((branch, bi) => {
        const cx = colW * bi + colW / 2;
        const label = this.add.text(cx, 160, branch.name, {
          fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f2e2b8', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.treeContainer.add(label);

        const nodesState = this.state.profile.classes[classId].nodes;
        branch.nodes.forEach((node, ni) => {
          const y = 210 + ni * 100;
          const unlocked = Boolean(nodesState[`${branch.id}_${node.id}`]);
          const prevUnlocked = ni === 0 || Boolean(nodesState[`${branch.id}_${branch.nodes[ni - 1].id}`]);
          const box = UI.makePanel(this, cx, y, colW - 40, 84);
          box.setTint(unlocked ? 0xffffff : (prevUnlocked ? 0xd8d0b8 : 0x777777));
          const name = this.add.text(cx, y - 18, node.name, {
            fontFamily: 'Georgia, serif', fontSize: '14px', color: '#3a2c1a', fontStyle: 'bold'
          }).setOrigin(0.5);
          const desc = this.add.text(cx, y + 6, node.desc, {
            fontFamily: 'Georgia, serif', fontSize: '11px', color: '#5a4a32', wordWrap: { width: colW - 60 }
          }).setOrigin(0.5);
          this.treeContainer.add([box, name, desc]);

          if (unlocked) {
            const check = this.add.text(cx + colW / 2 - 46, y - 30, '✔', { fontSize: '20px', color: '#2ecc71' }).setOrigin(0.5);
            this.treeContainer.add(check);
          } else if (prevUnlocked && this.classPoints() > 0) {
            box.setInteractive({ useHandCursor: true });
            box.on('pointerdown', () => this.unlockNode(classId, branch, node));
          }
        });
      });
    }

    unlockNode(classId, branch, node) {
      if (this.classPoints() <= 0) return;
      const key = `${branch.id}_${node.id}`;
      const classState = this.state.profile.classes[classId];
      if (classState.nodes[key]) return;
      classState.nodes[key] = true;
      classState.spent = (classState.spent || 0) + 1;
      global.GuardioesSave.save(this.state);
      this.renderClass(classId);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.ClassTreeScene = ClassTreeScene;
})(window);
