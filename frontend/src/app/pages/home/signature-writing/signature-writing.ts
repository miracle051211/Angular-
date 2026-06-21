import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface SwapCharacter {
  readonly front: string;
  readonly back: string;
  readonly delay: string;
}

interface SwapLine {
  readonly frontLabel: string;
  readonly backLabel: string;
  readonly characters: readonly SwapCharacter[];
}

@Component({
  selector: 'app-signature-writing',
  templateUrl: './signature-writing.html',
  styleUrl: './signature-writing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignatureWritingComponent {
  protected readonly isSwapped = signal(false);
  protected readonly titleLetters = signal(
    this.createSwapCharacters('学习小洞天', '悟知小灵境', 0.045),
  );
  protected readonly textLines = signal<readonly SwapLine[]>([
    {
      ...this.createSwapLine(
        '这是一个给学习留出的安静角落：像洞天一样不喧哗，却能装下好奇心、笔记、讨论和慢慢长出来的想法。',
        '换个名字后它像一处更轻的灵境：把灵感、问题、手稿和未完成的念头悄悄收好，等你回来。再慢慢展开。',
      ),
    },
    {
      ...this.createSwapLine(
        '在这里，知识不是被匆忙消费的内容，而是可以被反复书写、理解和分享的日常。',
        '翻到背面时，讨论变成微光，笔记成为路径，理解慢慢抵达你身边。在心里生根。',
      ),
    },
  ]);

  protected setSwapState(isSwapped: boolean): void {
    this.isSwapped.set(isSwapped);
  }

  private createSwapCharacters(
    front: string,
    back: string,
    staggerDuration: number,
  ): readonly SwapCharacter[] {
    const frontCharacters = Array.from(front);
    const backCharacters = Array.from(back);

    if (frontCharacters.length !== backCharacters.length) {
      throw new Error('Swap text must keep the same character count.');
    }

    return frontCharacters.map((frontCharacter, index) => ({
      front: frontCharacter,
      back: backCharacters[index],
      delay: `${(index * staggerDuration).toFixed(3)}s`,
    }));
  }

  private createSwapLine(frontLabel: string, backLabel: string): SwapLine {
    return {
      frontLabel,
      backLabel,
      characters: this.createSwapCharacters(frontLabel, backLabel, 0.012),
    };
  }
}
