import { describe, expect, test } from 'vitest';
import { paragraphsToHtmlComment } from 'src/lib/formats/x-to-html-comment/paragraphs-to-html-comment';

describe('outline-to-html-comment', () => {
    test('case 1', () => {
        const input = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu placerat odio, quis ullamcorper mauris. 
Quisque cursus, mauris sagittis fringilla elementum, magna tortor imperdiet purus, sed interdum odio orci efficitur nibh. Suspendisse et scelerisque velit. Nam euismod quis ex nec feugiat. Pellentesque dapibus vel odio quis laoreet. Praesent quam lectus, feugiat sed nunc egestas, pulvinar placerat ipsum. In sollicitudin vulputate magna, at fermentum lorem suscipit quis.




Phasellus consequat mattis mi, in fringilla felis tincidunt in. Curabitur ultricies euismod est id accumsan. 
Praesent posuere condimentum velit in commodo. Quisque congue urna erat, gravida volutpat neque tempus nec. 
Cras vestibulum aliquet arcu nec tincidunt. Nam sit amet lorem mi. In tortor orci, pulvinar eget iaculis ultrices, congue in orci. Vivamus sed vulputate tellus, vitae tincidunt enim. Nunc scelerisque eu neque ac tempor. Quisque bibendum lacus risus, vel tempus sapien dapibus vel. Nam semper condimentum magna, imperdiet lacinia velit scelerisque a. Aliquam at elit malesuada, vehicula nisl in, suscipit orci. Aliquam ac diam laoreet, egestas urna sit amet, vehicula lorem. Nulla ac egestas purus. Vivamus sit amet feugiat orci, eu tincidunt purus. Praesent nisi mi, imperdiet ut ipsum ac, auctor tempus est.


In vestibulum, neque sit amet elementum aliquet, leo velit posuere sem, quis consectetur justo mi a lacus. Duis hendrerit ultricies ante, vel semper ex tempor eget. Maecenas eleifend ex at egestas malesuada. Pellentesque vitae ligula imperdiet, fermentum mi a, vulputate felis. Cras eget elit in nibh fringilla tristique non in est. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum semper commodo metus, ullamcorper semper neque imperdiet et. Nullam interdum, dolor quis malesuada scelerisque, est magna ultrices massa, sit amet sodales urna nisl vitae orci. Nam viverra varius dictum. Curabitur quam nisl, blandit in sapien non, consectetur suscipit quam. Mauris efficitur lorem et sapien sagittis efficitur. Vestibulum varius orci ex, a facilisis odio lobortis quis. Quisque eget erat nibh. Cras id sem non augue sodales vestibulum.

In placerat, nunc ac sodales pretium, elit ligula gravida lacus, sed suscipit felis nibh eget mi. Suspendisse eu mauris non diam maximus eleifend. Mauris fringilla placerat dui at mattis. Cras ut pharetra dui. Cras condimentum lacus augue, sed efficitur quam malesuada in.
 Proin laoreet quam eu nunc accumsan, quis vehicula urna gravida. Ut sollicitudin lacus nec neque pharetra luctus. Fusce quis eleifend magna, id laoreet dui. Curabitur vitae nisi vel metus sodales facilisis sed sed risus. In purus justo, interdum eget condimentum at, placerat ut mi. Mauris metus magna, ullamcorper et porttitor quis, pretium non sem. Donec hendrerit dolor at urna gravida, id volutpat tellus condimentum. Fusce posuere tellus et lorem vulputate varius.

 \`\`\`python
In vestibulum, neque sit amet elementum aliquet, leo velit posuere sem, quis consectetur justo mi a lacus. Duis hendrerit ultricies ante, vel semper ex tempor eget. Maecenas eleifend ex at egestas malesuada. Pellentesque vitae ligula imperdiet, fermentum mi a, vulputate felis. Cras eget elit in nibh fringilla tristique non in est. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum semper commodo metus, ullamcorper semper neque imperdiet et. Nullam interdum, dolor quis malesuada scelerisque, est magna ultrices massa, sit amet sodales urna nisl vitae orci. Nam viverra varius dictum. Curabitur quam nisl, blandit in sapien non, consectetur suscipit quam. Mauris efficitur lorem et sapien sagittis efficitur. Vestibulum varius orci ex, a facilisis odio lobortis quis. Quisque eget erat nibh. Cras id sem non augue sodales vestibulum.

In placerat, nunc ac sodales pretium, elit ligula gravida lacus, sed suscipit felis nibh eget mi. Suspendisse eu mauris non diam maximus eleifend. Mauris fringilla placerat dui at mattis. Cras ut pharetra dui. Cras condimentum lacus augue, sed efficitur quam malesuada in.
 Proin laoreet quam eu nunc accumsan, quis vehicula urna gravida.
  
  
Ut sollicitudin lacus nec neque pharetra luctus. Fusce quis eleifend magna, id laoreet dui. Curabitur vitae nisi vel metus sodales facilisis sed sed risus. In purus justo, interdum eget condimentum at, placerat ut mi. Mauris metus magna, ullamcorper et porttitor quis, pretium non sem. Donec hendrerit dolor at urna gravida, id volutpat tellus condimentum. Fusce posuere tellus et lorem vulputate varius.
 
 \`\`\`




Morbi ultrices augue quis vestibulum pharetra. Aliquam vestibulum purus ut semper consectetur. Etiam sodales urna id massa vulputate, vitae scelerisque velit lacinia. Aenean mattis, magna vel viverra ultrices, tortor urna porttitor sem, eu interdum massa justo lobortis nisi. 
Ut convallis odio sed lectus posuere imperdiet. Aliquam fermentum bibendum lacinia. Nunc consequat nulla eleifend scelerisque lobortis. Aliquam tincidunt finibus imperdiet.`;

        const output = `
<!--section: 1-->
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu placerat odio, quis ullamcorper mauris. 
Quisque cursus, mauris sagittis fringilla elementum, magna tortor imperdiet purus, sed interdum odio orci efficitur nibh. Suspendisse et scelerisque velit. Nam euismod quis ex nec feugiat. Pellentesque dapibus vel odio quis laoreet. Praesent quam lectus, feugiat sed nunc egestas, pulvinar placerat ipsum. In sollicitudin vulputate magna, at fermentum lorem suscipit quis.

<!--section: 2-->
Phasellus consequat mattis mi, in fringilla felis tincidunt in. Curabitur ultricies euismod est id accumsan. 
Praesent posuere condimentum velit in commodo. Quisque congue urna erat, gravida volutpat neque tempus nec. 
Cras vestibulum aliquet arcu nec tincidunt. Nam sit amet lorem mi. In tortor orci, pulvinar eget iaculis ultrices, congue in orci. Vivamus sed vulputate tellus, vitae tincidunt enim. Nunc scelerisque eu neque ac tempor. Quisque bibendum lacus risus, vel tempus sapien dapibus vel. Nam semper condimentum magna, imperdiet lacinia velit scelerisque a. Aliquam at elit malesuada, vehicula nisl in, suscipit orci. Aliquam ac diam laoreet, egestas urna sit amet, vehicula lorem. Nulla ac egestas purus. Vivamus sit amet feugiat orci, eu tincidunt purus. Praesent nisi mi, imperdiet ut ipsum ac, auctor tempus est.

<!--section: 3-->
In vestibulum, neque sit amet elementum aliquet, leo velit posuere sem, quis consectetur justo mi a lacus. Duis hendrerit ultricies ante, vel semper ex tempor eget. Maecenas eleifend ex at egestas malesuada. Pellentesque vitae ligula imperdiet, fermentum mi a, vulputate felis. Cras eget elit in nibh fringilla tristique non in est. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum semper commodo metus, ullamcorper semper neque imperdiet et. Nullam interdum, dolor quis malesuada scelerisque, est magna ultrices massa, sit amet sodales urna nisl vitae orci. Nam viverra varius dictum. Curabitur quam nisl, blandit in sapien non, consectetur suscipit quam. Mauris efficitur lorem et sapien sagittis efficitur. Vestibulum varius orci ex, a facilisis odio lobortis quis. Quisque eget erat nibh. Cras id sem non augue sodales vestibulum.

<!--section: 4-->
In placerat, nunc ac sodales pretium, elit ligula gravida lacus, sed suscipit felis nibh eget mi. Suspendisse eu mauris non diam maximus eleifend. Mauris fringilla placerat dui at mattis. Cras ut pharetra dui. Cras condimentum lacus augue, sed efficitur quam malesuada in.
 Proin laoreet quam eu nunc accumsan, quis vehicula urna gravida. Ut sollicitudin lacus nec neque pharetra luctus. Fusce quis eleifend magna, id laoreet dui. Curabitur vitae nisi vel metus sodales facilisis sed sed risus. In purus justo, interdum eget condimentum at, placerat ut mi. Mauris metus magna, ullamcorper et porttitor quis, pretium non sem. Donec hendrerit dolor at urna gravida, id volutpat tellus condimentum. Fusce posuere tellus et lorem vulputate varius.

<!--section: 5-->
 \`\`\`python
In vestibulum, neque sit amet elementum aliquet, leo velit posuere sem, quis consectetur justo mi a lacus. Duis hendrerit ultricies ante, vel semper ex tempor eget. Maecenas eleifend ex at egestas malesuada. Pellentesque vitae ligula imperdiet, fermentum mi a, vulputate felis. Cras eget elit in nibh fringilla tristique non in est. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum semper commodo metus, ullamcorper semper neque imperdiet et. Nullam interdum, dolor quis malesuada scelerisque, est magna ultrices massa, sit amet sodales urna nisl vitae orci. Nam viverra varius dictum. Curabitur quam nisl, blandit in sapien non, consectetur suscipit quam. Mauris efficitur lorem et sapien sagittis efficitur. Vestibulum varius orci ex, a facilisis odio lobortis quis. Quisque eget erat nibh. Cras id sem non augue sodales vestibulum.

In placerat, nunc ac sodales pretium, elit ligula gravida lacus, sed suscipit felis nibh eget mi. Suspendisse eu mauris non diam maximus eleifend. Mauris fringilla placerat dui at mattis. Cras ut pharetra dui. Cras condimentum lacus augue, sed efficitur quam malesuada in.
 Proin laoreet quam eu nunc accumsan, quis vehicula urna gravida.
  
  
Ut sollicitudin lacus nec neque pharetra luctus. Fusce quis eleifend magna, id laoreet dui. Curabitur vitae nisi vel metus sodales facilisis sed sed risus. In purus justo, interdum eget condimentum at, placerat ut mi. Mauris metus magna, ullamcorper et porttitor quis, pretium non sem. Donec hendrerit dolor at urna gravida, id volutpat tellus condimentum. Fusce posuere tellus et lorem vulputate varius.
 
 \`\`\`

<!--section: 6-->
Morbi ultrices augue quis vestibulum pharetra. Aliquam vestibulum purus ut semper consectetur. Etiam sodales urna id massa vulputate, vitae scelerisque velit lacinia. Aenean mattis, magna vel viverra ultrices, tortor urna porttitor sem, eu interdum massa justo lobortis nisi. 
Ut convallis odio sed lectus posuere imperdiet. Aliquam fermentum bibendum lacinia. Nunc consequat nulla eleifend scelerisque lobortis. Aliquam tincidunt finibus imperdiet.`;
        expect(paragraphsToHtmlComment(input)).toEqual(output);
    });
});
